import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShoppingCart, Plus, Edit, Trash2, Calculator, GitCompareArrows } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export default function ShoppingLists() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading, user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: lists, isLoading: listsLoading } = useQuery({
    queryKey: ["shopping-lists", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("shopping_list")
        .select(`
          *,
          shopping_list_item(count)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const createListMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await supabase.from("shopping_list").insert({
        user_id: user.id,
        name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lista criada com sucesso!");
      setShowCreateDialog(false);
      setNewListName("");
      queryClient.invalidateQueries({ queryKey: ["shopping-lists"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar lista");
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from("shopping_list")
        .delete()
        .eq("id", listId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lista excluída com sucesso!");
      setDeleteListId(null);
      queryClient.invalidateQueries({ queryKey: ["shopping-lists"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao excluir lista");
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Minhas Listas</h1>
            <p className="text-muted-foreground">
              Gerencie suas listas de compras
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Lista
          </Button>
        </div>

        {listsLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {!listsLoading && lists && lists.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Você ainda não tem listas de compras
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Lista
              </Button>
            </CardContent>
          </Card>
        )}

        {lists && lists.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lists.map((list: any) => (
              <Card key={list.id} className="group hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{list.name}</CardTitle>
                      <CardDescription>
                        {list.shopping_list_item?.[0]?.count || 0} {list.shopping_list_item?.[0]?.count === 1 ? "item" : "itens"}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setDeleteListId(list.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/lists/${list.id}`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Itens
                  </Button>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => navigate(`/lists/${list.id}/calculate`)}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Calcular Total
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => navigate(`/lists/${list.id}/compare`)}
                  >
                    <GitCompareArrows className="h-4 w-4 mr-2" />
                    Comparar 2 Mercados
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Lista de Compras</DialogTitle>
              <DialogDescription>
                Dê um nome para sua nova lista
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Lista</Label>
                <Input
                  id="name"
                  placeholder="Ex: Compras do Mês"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  maxLength={100}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createListMutation.mutate(newListName)}
                disabled={!newListName.trim() || createListMutation.isPending}
              >
                {createListMutation.isPending ? "Criando..." : "Criar Lista"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteListId} onOpenChange={() => setDeleteListId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Lista</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta lista? Todos os itens serão removidos.
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteListId && deleteListMutation.mutate(deleteListId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
