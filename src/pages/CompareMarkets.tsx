import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, GitCompareArrows } from "lucide-react";
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

export default function CompareMarkets() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [marketA, setMarketA] = useState("");
  const [marketB, setMarketB] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("");

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

  const { data: supermarkets } = useQuery({
    queryKey: ["supermarkets", selectedCity],
    queryFn: async () => {
      let query = supabase
        .from("supermarkets")
        .select("*")
        .eq("status", "active");
      
      if (selectedCity) {
        query = query.eq("city", selectedCity);
      }
      
      const { data, error } = await query.order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: comparison, isLoading: comparisonLoading } = useQuery({
    queryKey: ["compare-markets", id, marketA, marketB],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_compare_two_markets", {
        p_list_id: id,
        p_market_a: marketA,
        p_market_b: marketB,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && !!marketA && !!marketB,
  });

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getCheaperBadge = (cheaper: string | null) => {
    if (cheaper === "A") return <Badge variant="success">{marketAName}</Badge>;
    if (cheaper === "B") return <Badge variant="success">{marketBName}</Badge>;
    if (cheaper === "equal") return <Badge variant="outline">Igual</Badge>;
    return null;
  };

  const marketAName = supermarkets?.find((m) => m.id === marketA)?.name || "Mercado A";
  const marketBName = supermarkets?.find((m) => m.id === marketB)?.name || "Mercado B";

  const totalA = comparison?.reduce((sum: number, item: any) => sum + (item.price_a || 0), 0) || 0;
  const totalB = comparison?.reduce((sum: number, item: any) => sum + (item.price_b || 0), 0) || 0;

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
            <p className="text-muted-foreground">Compare preços entre dois supermercados</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Selecione a Cidade e os Supermercados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Select value={selectedCity} onValueChange={(value) => {
                setSelectedCity(value);
                setMarketA("");
                setMarketB("");
              }}>
                <SelectTrigger id="city">
                  <SelectValue placeholder="Todas as cidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as cidades</SelectItem>
                  {cities?.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="marketA">Mercado A</Label>
              <Select value={marketA} onValueChange={setMarketA}>
                <SelectTrigger id="marketA">
                  <SelectValue placeholder="Selecione o primeiro mercado" />
                </SelectTrigger>
                <SelectContent>
                  {supermarkets?.filter((m) => m.id !== marketB).map((market) => (
                    <SelectItem key={market.id} value={market.id}>
                      {market.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marketB">Mercado B</Label>
              <Select value={marketB} onValueChange={setMarketB}>
                <SelectTrigger id="marketB">
                  <SelectValue placeholder="Selecione o segundo mercado" />
                </SelectTrigger>
                <SelectContent>
                  {supermarkets?.filter((m) => m.id !== marketA).map((market) => (
                    <SelectItem key={market.id} value={market.id}>
                      {market.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            </div>
          </CardContent>
        </Card>

        {marketA && marketB && !comparisonLoading && comparison && comparison.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className={totalA < totalB ? "border-success/50 bg-success/5" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {marketAName}
                    {totalA < totalB && <Badge variant="success">Mais Barato</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatCurrency(totalA)}
                  </div>
                </CardContent>
              </Card>

              <Card className={totalB < totalA ? "border-success/50 bg-success/5" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {marketBName}
                    {totalB < totalA && <Badge variant="success">Mais Barato</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatCurrency(totalB)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCompareArrows className="h-5 w-5" />
                  Comparação Detalhada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">{marketAName}</TableHead>
                        <TableHead className="text-right">{marketBName}</TableHead>
                        <TableHead className="text-center">Mais Barato</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison.map((item: any) => (
                        <TableRow key={item.product_id}>
                          <TableCell className="font-medium">
                            <div>
                              {item.product_name}
                              {item.missing_in?.length > 0 && (
                                <div className="text-xs text-destructive mt-1">
                                  Faltante em: {item.missing_in.map((m: string) => m === "A" ? marketAName : marketBName).join(", ")}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div>
                              <div>{formatCurrency(item.price_a)}</div>
                              {item.has_wholesale_a && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Atacado: {formatCurrency(item.wholesale_price_a)} (mín. {item.wholesale_qty_a} un.)
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div>
                              <div>{formatCurrency(item.price_b)}</div>
                              {item.has_wholesale_b && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Atacado: {formatCurrency(item.wholesale_price_b)} (mín. {item.wholesale_qty_b} un.)
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {getCheaperBadge(item.cheaper)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {totalA !== totalB && (
              <Card className="bg-success/10 border-success/50">
                <CardContent className="pt-6">
                  <p className="font-semibold text-center">
                    Economia de {formatCurrency(Math.abs(totalA - totalB))} comprando no{" "}
                    {totalA < totalB ? marketAName : marketBName}!
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {marketA && marketB && comparisonLoading && (
          <Card>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {marketA && marketB && !comparisonLoading && (!comparison || comparison.length === 0) && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                Nenhum preço encontrado para comparação entre estes mercados
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
