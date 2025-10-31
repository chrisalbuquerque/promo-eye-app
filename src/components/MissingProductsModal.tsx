import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MissingProductsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  supermarketId: string;
  supermarketName: string;
}

export function MissingProductsModal({
  open,
  onOpenChange,
  listId,
  supermarketId,
  supermarketName,
}: MissingProductsModalProps) {
  const { data: missingProducts, isLoading } = useQuery({
    queryKey: ["missing-products", listId, supermarketId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_get_missing_products", {
        p_list_id: listId,
        p_supermarket_id: supermarketId,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!listId && !!supermarketId,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalMissing = missingProducts?.reduce(
    (sum: number, item: any) => sum + (item.cheapest_price || 0),
    0
  ) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Produtos Faltantes - {supermarketName}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        )}

        {!isLoading && missingProducts && missingProducts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum produto faltante encontrado
          </div>
        )}

        {!isLoading && missingProducts && missingProducts.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Mercado Alternativo</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingProducts.map((item: any) => (
                    <TableRow key={item.product_id}>
                      <TableCell className="font-medium">
                        {item.product_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.cheapest_supermarket_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.cheapest_price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Total com Produtos Faltantes</p>
                  <p className="text-xs text-muted-foreground">
                    Comprando os faltantes nos mercados mais baratos
                  </p>
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalMissing)}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
