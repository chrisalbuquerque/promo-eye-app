import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Package, DollarSign, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [supermarkets, products, prices, ocrBatches] = await Promise.all([
        supabase.from("supermarkets").select("id", { count: "exact", head: true }),
        supabase.from("product_master").select("id", { count: "exact", head: true }),
        supabase.from("sku_price").select("id", { count: "exact", head: true }),
        supabase.from("ocr_batch").select("id", { count: "exact", head: true }),
      ]);

      return {
        supermarkets: supermarkets.count || 0,
        products: products.count || 0,
        prices: prices.count || 0,
        ocrBatches: ocrBatches.count || 0,
      };
    },
    enabled: isAdmin,
  });

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">Acesso negado. Você não tem permissão de administrador.</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const statCards = [
    {
      title: "Supermercados",
      value: stats?.supermarkets || 0,
      icon: Store,
      description: "Supermercados cadastrados",
      gradient: "from-primary to-primary-glow",
      action: () => navigate("/admin/supermarkets"),
    },
    {
      title: "Produtos",
      value: stats?.products || 0,
      icon: Package,
      description: "Produtos no catálogo",
      gradient: "from-accent to-primary",
      action: () => navigate("/admin/products"),
    },
    {
      title: "Preços",
      value: stats?.prices || 0,
      icon: DollarSign,
      description: "Preços cadastrados",
      gradient: "from-success to-primary-glow",
      action: () => navigate("/admin/prices"),
    },
    {
      title: "Lotes OCR",
      value: stats?.ocrBatches || 0,
      icon: Image,
      description: "Imagens processadas",
      gradient: "from-secondary to-accent",
      action: () => navigate("/admin/ocr"),
    },
  ];

  return (
    <Layout isAdmin={isAdmin}>
      <div className="space-y-6 pb-20 md:pb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Painel Administrativo</h1>
          <p className="text-muted-foreground">
            Gerencie supermercados, produtos, preços e OCR
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="group cursor-pointer transition-all hover:shadow-lg hover:scale-105"
                onClick={stat.action}
              >
                <CardHeader>
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${stat.gradient} mb-4 shadow-md`}>
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-3xl font-bold">{stat.value}</CardTitle>
                  <CardDescription>{stat.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Gerenciar
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Button onClick={() => navigate("/admin/supermarkets")} className="w-full">
              <Store className="h-4 w-4 mr-2" />
              Adicionar Supermercado
            </Button>
            <Button onClick={() => navigate("/admin/products")} className="w-full">
              <Package className="h-4 w-4 mr-2" />
              Adicionar Produto
            </Button>
            <Button onClick={() => navigate("/admin/ocr")} className="w-full">
              <Image className="h-4 w-4 mr-2" />
              Processar Imagens OCR
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Sobre o Painel Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Supermercados</h3>
              <p className="text-sm text-muted-foreground">
                Cadastre e gerencie os supermercados disponíveis para comparação.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Produtos</h3>
              <p className="text-sm text-muted-foreground">
                Gerencie o catálogo mestre de produtos com nome, marca, categoria e EAN.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Preços</h3>
              <p className="text-sm text-muted-foreground">
                Cadastre preços de produtos por supermercado. Os preços mais recentes são usados nas comparações.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">OCR</h3>
              <p className="text-sm text-muted-foreground">
                Envie imagens de prateleiras ou panfletos para extração automática de preços via Google Cloud Vision.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
