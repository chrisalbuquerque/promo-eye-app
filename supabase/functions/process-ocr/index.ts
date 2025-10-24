import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batchId, imageFiles } = await req.json();
    
    if (!batchId || !imageFiles || imageFiles.length === 0) {
      throw new Error("Batch ID e imagens são obrigatórios");
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Processando ${imageFiles.length} imagens para o lote ${batchId}`);

    // Atualizar status do lote para "processing"
    await supabase
      .from('ocr_batch')
      .update({ status: 'processing' })
      .eq('id', batchId);

    let processedCount = 0;
    const errors = [];

    for (const imageFile of imageFiles) {
      try {
        console.log(`Processando imagem: ${imageFile.path}`);
        
        // Fazer download da imagem do storage
        const { data: imageData, error: downloadError } = await supabase
          .storage
          .from('ocr-images')
          .download(imageFile.path);

        if (downloadError) {
          throw new Error(`Erro ao baixar imagem: ${downloadError.message}`);
        }

        // Converter para base64
        const arrayBuffer = await imageData.arrayBuffer();
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        // Chamar OpenAI Vision API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Analise esta imagem de prateleira de supermercado ou panfleto. Extraia todos os produtos visíveis com seus nomes, marcas e preços. Retorne no formato JSON com array "items", onde cada item tem: "name" (nome do produto), "brand" (marca), "price" (preço em número), "confidence" (confiança de 0 a 1). Se não conseguir identificar algum campo, use null.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 1000
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const aiResponse = await response.json();
        const content = aiResponse.choices[0].message.content;
        
        console.log('Resposta da OpenAI:', content);

        // Tentar extrair JSON da resposta
        let items = [];
        try {
          // A resposta pode estar em blocos de código markdown
          const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
          const jsonContent = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
          const parsed = JSON.parse(jsonContent);
          items = parsed.items || [];
        } catch (e) {
          console.error('Erro ao parsear JSON:', e);
          // Se não conseguir parsear, criar um item com o texto bruto
          items = [{
            name: content.substring(0, 200),
            brand: null,
            price: null,
            confidence: 0.5
          }];
        }

        // Inserir itens no banco
        for (const item of items) {
          await supabase
            .from('ocr_item')
            .insert({
              batch_id: batchId,
              raw_text: `${item.name || ''} ${item.brand || ''}`.trim(),
              confidence: item.confidence || 0.8,
              meta: {
                image_path: imageFile.path,
                extracted_price: item.price,
                extracted_name: item.name,
                extracted_brand: item.brand
              }
            });
        }

        processedCount++;
        console.log(`Imagem processada com sucesso: ${imageFile.path} (${items.length} itens extraídos)`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao processar imagem ${imageFile.path}:`, error);
        errors.push({
          path: imageFile.path,
          error: errorMessage
        });
      }
    }

    // Atualizar status final do lote
    const finalStatus = errors.length === 0 ? 'done' : 'error';
    await supabase
      .from('ocr_batch')
      .update({ 
        status: finalStatus,
        meta: errors.length > 0 ? { errors } : null
      })
      .eq('id', batchId);

    return new Response(
      JSON.stringify({ 
        success: true,
        processedCount,
        totalCount: imageFiles.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Erro no processamento OCR:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
