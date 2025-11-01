import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminPrices() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    supermarket_id: "",
    product_id: "",
    price: "",
    price_type: "varejo",
    min_quantity: "1",
  });
  const [productSearch, setProductSearch] = useState("");

  const { data: supermarkets } = useQuery({
    queryKey: ["supermarkets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supermarkets")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: products } = useQuery({
    queryKey: ["products-list", productSearch],
    queryFn: async () => {
      let query = supabase
        .from("product_master")
        .select("id, name, brand, ean")
        .order("name");
      
      if (productSearch) {
        query = query.or(`name.ilike.%${productSearch}%,ean.eq.${productSearch}`);
      }
      
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: prices, isLoading } = useQuery({
    queryKey: ["admin-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sku_price")
        .select(`
          *,
          supermarkets(name),
          product_master(name, brand)
        `)
        .order("captured_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("sku_price").insert({
        supermarket_id: data.supermarket_id,
        product_id: data.product_id,
        price: parseFloat(data.price),
        price_type: data.price_type,
        min_quantity: data.price_type === "atacado" ? parseInt(data.min_quantity) : 1,
        source: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prices"] });
      toast.success("Preço cadastrado");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Erro ao cadastrar preço");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sku_price").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prices"] });
      toast.success("Preço removido");
    },
    onError: () => {
      toast.error("Erro ao remover preço");
    },
  });

  const resetForm = () => {
    setFormData({ supermarket_id: "", product_id: "", price: "", price_type: "varejo", min_quantity: "1" });
    setProductSearch("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Preços</h1>
            <p className="text-muted-foreground">Cadastre preços de produtos</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Preço
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Preço</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="supermarket">Supermercado *</Label>
                  <Select
                    value={formData.supermarket_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, supermarket_id: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {supermarkets?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="product">Produto *</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Buscar por nome ou EAN"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                    <Select
                      value={formData.product_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, product_id: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} {p.brand && `- ${p.brand}`} {p.ean && `(${p.ean})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="price_type">Tipo de Preço *</Label>
                  <Select
                    value={formData.price_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, price_type: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="varejo">Varejo</SelectItem>
                      <SelectItem value="atacado">Atacado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="price">Preço (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                {formData.price_type === "atacado" && (
                  <div>
                    <Label htmlFor="min_quantity">Quantidade Mínima *</Label>
                    <Input
                      id="min_quantity"
                      type="number"
                      min="1"
                      value={formData.min_quantity}
                      onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                      required
                    />
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Preços Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : !prices || prices.length === 0 ? (
              <p className="text-muted-foreground">Nenhum preço cadastrado</p>
            ) : (
              <div className="space-y-2">
                {prices.map((price: any) => (
                  <div
                    key={price.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-semibold">
                        {price.product_master?.name}
                        {price.product_master?.brand && ` - ${price.product_master.brand}`}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {price.supermarkets?.name} • R$ {parseFloat(price.price).toFixed(2)}
                        {price.price_type === "atacado" && ` • Atacado (mín. ${price.min_quantity} un.)`}
                        {price.price_type === "varejo" && " • Varejo"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(price.captured_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        if (confirm("Remover este preço?")) {
                          deleteMutation.mutate(price.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
