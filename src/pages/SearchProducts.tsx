import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function SearchProducts() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedList, setSelectedList] = useState("");
  const [quantity, setQuantity] = useState("1");
  const queryClient = useQueryClient();

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products", searchQuery],
    queryFn: async () => {
      let query = supabase.from("product_master").select("*");
      
      if (searchQuery) {
        query = query.or(
          `name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,ean.eq.${searchQuery}`
        );
      }
      
      const { data, error } = await query.order("name").limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.length >= 2,
  });

  const { data: lists } = useQuery({
    queryKey: ["shopping-lists", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("shopping_list")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const addToListMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct || !selectedList || !quantity) {
        throw new Error("Preencha todos os campos");
      }

      const { error } = await supabase.from("shopping_list_item").insert({
        list_id: selectedList,
        product_id: selectedProduct.id,
        quantity: parseFloat(quantity),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto adicionado à lista!");
      setSelectedProduct(null);
      setSelectedList("");
      setQuantity("1");
      queryClient.invalidateQueries({ queryKey: ["shopping-list-items"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao adicionar produto");
    },
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

  return (
    <Layout isAdmin={isAdmin}>
      <div className="space-y-6 pb-20 md:pb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Buscar Produtos</h1>
          <p className="text-muted-foreground">
            Pesquise por nome, marca ou código de barras
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Digite o nome do produto, marca ou EAN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Digite pelo menos 2 caracteres para buscar
            </CardContent>
          </Card>
        )}

        {productsLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {!productsLoading && products && products.length === 0 && searchQuery.length >= 2 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">
                Nenhum produto encontrado para "{searchQuery}"
              </p>
            </CardContent>
          </Card>
        )}

        {products && products.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id} className="group hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <CardDescription>{product.brand}</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {product.category && (
                      <Badge variant="secondary">{product.category}</Badge>
                    )}
                    {product.unit && (
                      <Badge variant="outline">{product.unit}</Badge>
                    )}
                  </div>
                  {product.ean && (
                    <p className="text-xs text-muted-foreground mt-2">
                      EAN: {product.ean}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar à Lista
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar à Lista</DialogTitle>
              <DialogDescription>
                {selectedProduct?.name} - {selectedProduct?.brand}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="list">Lista</Label>
                <Select value={selectedList} onValueChange={setSelectedList}>
                  <SelectTrigger id="list">
                    <SelectValue placeholder="Selecione uma lista" />
                  </SelectTrigger>
                  <SelectContent>
                    {lists?.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                Cancelar
              </Button>
              <Button onClick={() => addToListMutation.mutate()} disabled={addToListMutation.isPending}>
                {addToListMutation.isPending ? "Adicionando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
