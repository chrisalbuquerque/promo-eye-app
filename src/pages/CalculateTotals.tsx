import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CalculateTotals() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();

  const { data: list } = useQuery({
    queryKey: ["shopping-list", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shopping_list")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: totals, isLoading: totalsLoading } = useQuery({
    queryKey: ["calculate-totals", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_calculate_totals", {
        p_list_id: id,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getCheapestBadge = (index: number) => {
    if (index === 0) return <Badge variant="success">Mais Barato</Badge>;
    if (index === 1) return <Badge variant="success-outline">2º Mais Barato</Badge>;
    return null;
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout isAdmin={isAdmin}>
      <div className="space-y-6 pb-20 md:pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/lists")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{list?.name}</h1>
            <p className="text-muted-foreground">Total por supermercado</p>
          </div>
        </div>

        {totalsLoading && (
          <Card>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!totalsLoading && totals && totals.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">
                Nenhum preço encontrado para os produtos desta lista
              </p>
              <Button variant="outline" onClick={() => navigate(`/lists/${id}`)}>
                Voltar para Lista
              </Button>
            </CardContent>
          </Card>
        )}

        {totals && totals.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {totals.slice(0, 2).map((total: any, index: number) => (
                <Card
                  key={total.supermarket_id}
                  className="border-primary/50 shadow-md bg-gradient-to-br from-success/5 to-background"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{total.supermarket_name}</CardTitle>
                      {getCheapestBadge(index)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-3xl font-bold text-success">
                      <span>{formatCurrency(total.total_amount)}</span>
                      <TrendingDown className="h-8 w-8" />
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{total.found_count} encontrados</span>
                      {total.missing_count > 0 && (
                        <span className="text-destructive">{total.missing_count} faltantes</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Comparação Completa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supermercado</TableHead>
                        <TableHead className="text-center">Encontrados</TableHead>
                        <TableHead className="text-center">Faltantes</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {totals.map((total: any, index: number) => (
                        <TableRow key={total.supermarket_id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {total.supermarket_name}
                              {getCheapestBadge(index)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{total.found_count}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {total.missing_count > 0 ? (
                              <Badge variant="destructive">{total.missing_count}</Badge>
                            ) : (
                              <Badge variant="outline">0</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(total.total_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {totals.length > 0 && totals[0].missing_count === 0 && (
              <Card className="bg-success/10 border-success/50">
                <CardContent className="pt-6 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold">Todos os produtos disponíveis!</p>
                    <p className="text-sm text-muted-foreground">
                      O supermercado mais barato tem todos os itens da sua lista.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
