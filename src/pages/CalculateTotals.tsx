import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { MissingProductsModal } from "@/components/MissingProductsModal";

export default function CalculateTotals() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedSupermarket, setSelectedSupermarket] = useState<{
    id: string;
    name: string;
  } | null>(null);

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

  const { data: cities } = useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supermarkets")
        .select("city")
        .eq("status", "active")
        .not("city", "is", null);
      if (error) throw error;
      const uniqueCities = [...new Set(data.map((s) => s.city))].filter(Boolean).sort();
      return uniqueCities as string[];
    },
  });

  const { data: totals, isLoading: totalsLoading } = useQuery({
    queryKey: ["calculate-totals", id, selectedCity],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_calculate_totals", {
        p_list_id: id,
      });
      if (error) throw error;
      
      // Filtrar por cidade se selecionada
      if (selectedCity && selectedCity !== "all" && data) {
        const { data: supermarkets } = await supabase
          .from("supermarkets")
          .select("id, city")
          .eq("city", selectedCity);
        
        const supermarketIds = new Set(supermarkets?.map(s => s.id));
        return data.filter((t: any) => supermarketIds.has(t.supermarket_id));
      }
      
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

  const getCheapestBadge = (index: number, foundCount: number) => {
    // Encontrar o maior found_count
    const maxFoundCount = Math.max(...(totals?.map((t: any) => t.found_count) || [0]));
    
    // Só dar badge se tiver o máximo de produtos encontrados
    if (foundCount < maxFoundCount) return null;
    
    if (index === 0) return <Badge variant="success">Mais Barato</Badge>;
    if (index === 1) return <Badge variant="outline">2º Mais Barato</Badge>;
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

        <Card>
          <CardHeader>
            <CardTitle>Filtrar por Cidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger id="city">
                  <SelectValue placeholder="Todas as cidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as cidades</SelectItem>
                  {cities?.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

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
              {totals.slice(0, 2).map((total: any, index: number) => {
                const badge = getCheapestBadge(index, total.found_count);
                if (!badge) return null;
                
                return (
                  <Card
                    key={total.supermarket_id}
                    className="border-primary/50 shadow-md bg-gradient-to-br from-success/5 to-background"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{total.supermarket_name}</CardTitle>
                        {badge}
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
                          <Button
                            variant="link"
                            size="sm"
                            className="text-destructive p-0 h-auto"
                            onClick={() =>
                              setSelectedSupermarket({
                                id: total.supermarket_id,
                                name: total.supermarket_name,
                              })
                            }
                          >
                            {total.missing_count} faltantes
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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
                              {getCheapestBadge(index, total.found_count)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{total.found_count}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {total.missing_count > 0 ? (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto"
                                onClick={() =>
                                  setSelectedSupermarket({
                                    id: total.supermarket_id,
                                    name: total.supermarket_name,
                                  })
                                }
                              >
                                <Badge variant="destructive">{total.missing_count}</Badge>
                              </Button>
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

        <MissingProductsModal
          open={!!selectedSupermarket}
          onOpenChange={(open) => !open && setSelectedSupermarket(null)}
          listId={id || ""}
          supermarketId={selectedSupermarket?.id || ""}
          supermarketName={selectedSupermarket?.name || ""}
        />
      </div>
    </Layout>
  );
}
