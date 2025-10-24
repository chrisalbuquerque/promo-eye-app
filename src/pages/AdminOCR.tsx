import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminOCR() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: batches, isLoading } = useQuery({
    queryKey: ["admin-ocr-batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ocr_batch")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: items } = useQuery({
    queryKey: ["admin-ocr-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ocr_item")
        .select(`
          *,
          product_master(name, brand),
          ocr_batch(status, created_at)
        `)
        .order("id", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      toast.info("Enviando imagens...");

      // Criar lote
      const { data: batch, error: batchError } = await supabase
        .from("ocr_batch")
        .insert({
          status: "uploaded",
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Upload das imagens para o storage
      const uploadedFiles = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `${batch.id}/${Date.now()}_${i}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from("ocr-images")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Erro ao fazer upload:", uploadError);
          throw new Error(`Erro ao enviar ${file.name}: ${uploadError.message}`);
        }

        uploadedFiles.push({ path: fileName });
      }

      toast.success(`${files.length} imagem(ns) enviada(s)! Processando...`);
      
      // Chamar edge function para processar OCR
      const { data: processResult, error: processError } = await supabase.functions.invoke(
        "process-ocr",
        {
          body: {
            batchId: batch.id,
            imageFiles: uploadedFiles,
          },
        }
      );

      if (processError) throw processError;

      if (processResult.errors && processResult.errors.length > 0) {
        toast.warning(
          `Processamento concluído com ${processResult.errors.length} erro(s). ${processResult.processedCount} de ${processResult.totalCount} imagens processadas.`
        );
      } else {
        toast.success(
          `Processamento concluído! ${processResult.processedCount} imagens processadas com sucesso.`
        );
      }
      
      queryClient.invalidateQueries({ queryKey: ["admin-ocr-batches"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ocr-items"] });
      
      // Limpar input
      e.target.value = "";
    } catch (error: any) {
      console.error("Erro no upload/processamento:", error);
      toast.error("Erro: " + (error.message || "Erro desconhecido"));
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">Acesso negado</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout isAdmin={isAdmin}>
      <div className="space-y-6 pb-20 md:pb-8">
        <div>
          <h1 className="text-3xl font-bold">Processamento OCR</h1>
          <p className="text-muted-foreground">
            Envie imagens de prateleiras/panfletos para reconhecimento automático
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload de Imagens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 space-y-4">
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Envie imagens de prateleiras ou panfletos (PNG, JPG)
                </p>
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Button asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Selecionar Imagens
                    </span>
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Processamento automático via OpenAI Vision API
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lotes Enviados</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : !batches || batches.length === 0 ? (
              <p className="text-muted-foreground">Nenhum lote enviado</p>
            ) : (
              <div className="space-y-2">
                {batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">Lote {batch.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(batch.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <Badge variant={batch.status === "done" ? "success" : "secondary"}>
                      {batch.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Itens Reconhecidos (Revisão)</CardTitle>
          </CardHeader>
          <CardContent>
            {!items || items.length === 0 ? (
              <p className="text-muted-foreground">Nenhum item para revisar</p>
            ) : (
              <div className="space-y-2">
                {items.map((item: any) => (
                  <div key={item.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">
                          Texto: {item.raw_text || "N/A"}
                        </p>
                        {item.product_master && (
                          <p className="text-sm text-muted-foreground">
                            Produto: {item.product_master.name}
                            {item.product_master.brand && ` - ${item.product_master.brand}`}
                          </p>
                        )}
                        {item.confidence && (
                          <p className="text-xs text-muted-foreground">
                            Confiança: {(item.confidence * 100).toFixed(0)}%
                          </p>
                        )}
                      </div>
                      <Badge variant={item.matched_product_id ? "success" : "secondary"}>
                        {item.matched_product_id ? "Vinculado" : "Pendente"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
