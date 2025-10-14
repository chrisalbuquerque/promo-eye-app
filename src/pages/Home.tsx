import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ShoppingCart, GitCompareArrows, LayoutDashboard } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </Layout>
    );
  }

  const features = [
    {
      icon: Search,
      title: "Buscar Produtos",
      description: "Encontre produtos por nome, marca ou código de barras",
      action: () => navigate("/search"),
      gradient: "from-primary to-primary-glow",
    },
    {
      icon: ShoppingCart,
      title: "Minhas Listas",
      description: "Gerencie suas listas de compras e veja os melhores preços",
      action: () => navigate("/lists"),
      gradient: "from-accent to-primary",
    },
    {
      icon: GitCompareArrows,
      title: "Comparar Preços",
      description: "Compare preços entre supermercados e economize",
      action: () => navigate("/lists"),
      gradient: "from-success to-primary-glow",
    },
  ];

  return (
    <Layout isAdmin={isAdmin}>
      <div className="space-y-8 pb-20 md:pb-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
            Bem-vindo ao PromoEye
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Compare preços de supermercados e economize nas suas compras
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="group cursor-pointer transition-all hover:shadow-lg hover:scale-105"
                onClick={feature.action}
              >
                <CardHeader>
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${feature.gradient} mb-4 shadow-md`}>
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {isAdmin && (
            <Card
              className="group cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-primary/50"
              onClick={() => navigate("/admin")}
            >
              <CardHeader>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-destructive to-primary mb-4 shadow-md">
                  <LayoutDashboard className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="group-hover:text-primary transition-colors">
                  Painel Admin
                </CardTitle>
                <CardDescription>
                  Gerencie produtos, preços e supermercados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="default" className="w-full">
                  Acessar Painel
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="bg-gradient-to-br from-secondary/50 to-background border-primary/20">
          <CardHeader>
            <CardTitle>Como funciona?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold">Crie sua lista</h3>
                <p className="text-sm text-muted-foreground">
                  Adicione os produtos que você precisa comprar
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold">Compare preços</h3>
                <p className="text-sm text-muted-foreground">
                  Veja onde sua lista sai mais barata
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold">Economize</h3>
                <p className="text-sm text-muted-foreground">
                  Compre no supermercado com melhor preço
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
