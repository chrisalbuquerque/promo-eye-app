import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface FoundProduct {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
}

interface FoundProductsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  supermarketId: string;
  supermarketName: string;
}

export function FoundProductsModal({
  open,
  onOpenChange,
  listId,
  supermarketId,
  supermarketName,
}: FoundProductsModalProps) {
  const { data: foundProducts, isLoading } = useQuery({
    queryKey: ["found-products", listId, supermarketId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_get_found_products", {
        p_list_id: listId,
        p_supermarket_id: supermarketId,
      });

      if (error) throw error;
      return data as FoundProduct[];
    },
    enabled: open && !!listId && !!supermarketId,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalFound = foundProducts?.reduce(
    (sum, item) => sum + (Number(item.price) * Number(item.quantity)),
    0
  ) ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Produtos Encontrados - {supermarketName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !foundProducts || foundProducts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum produto encontrado neste mercado.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {foundProducts.map((item) => (
                  <TableRow key={item.product_id}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(Number(item.price) * Number(item.quantity))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(item.price)} × {item.quantity}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center font-semibold text-lg">
                <span>Total:</span>
                <span>{formatCurrency(totalFound)}</span>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
