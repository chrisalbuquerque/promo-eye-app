import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function EditList() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
  const queryClient = useQueryClient();

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

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["shopping-list-items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shopping_list_item")
        .select(`
          *,
          product_master(*)
        `)
        .eq("list_id", id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("shopping_list_item")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item removido!");
      setDeleteItemId(null);
      queryClient.invalidateQueries({ queryKey: ["shopping-list-items"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover item");
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const { error } = await supabase
        .from("shopping_list_item")
        .update({ quantity })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Quantidade atualizada!");
      setEditingItemId(null);
      queryClient.invalidateQueries({ queryKey: ["shopping-list-items"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar quantidade");
    },
  });

  const handleUpdateQuantity = (itemId: string) => {
    const qty = parseFloat(editQuantity);
    if (qty > 0) {
      updateQuantityMutation.mutate({ itemId, quantity: qty });
    }
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
            <p className="text-muted-foreground">Edite os itens da sua lista</p>
          </div>
          <Button onClick={() => navigate("/search")}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Produto
          </Button>
        </div>

        {itemsLoading && (
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

        {!itemsLoading && items && items.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Esta lista ainda não tem produtos
              </p>
              <Button onClick={() => navigate("/search")}>
                <Plus className="h-4 w-4 mr-2" />
                Buscar Produtos
              </Button>
            </CardContent>
          </Card>
        )}

        {items && items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Itens da Lista ({items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead className="text-center">Quantidade</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.product_master?.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {item.product_master?.brand || "Sem marca"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {editingItemId === item.id ? (
                            <div className="flex items-center gap-2 justify-center">
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(e.target.value)}
                                className="w-20"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleUpdateQuantity(item.id)}
                              >
                                OK
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingItemId(null)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingItemId(item.id);
                                setEditQuantity(item.quantity.toString());
                              }}
                              className="hover:text-primary transition-colors"
                            >
                              {item.quantity}
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteItemId(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Item</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover este item da lista?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteItemId && deleteItemMutation.mutate(deleteItemId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
