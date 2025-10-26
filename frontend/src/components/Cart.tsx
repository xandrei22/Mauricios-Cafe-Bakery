import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Minus, Plus, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

const Cart = () => {
  const { items, updateQuantity, removeItem, total } = useCart();

  const handleQuantityUpdate = (id: string, newQuantity: number) => {
    if (newQuantity < 1) {
      Swal.fire({
        toast: true,
        icon: 'error',
        text: 'Quantity cannot be less than 1',
        position: 'bottom-end',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }
    updateQuantity(id, newQuantity);
  };

  const handleRemoveItem = (id: string) => {
    Swal.fire({
      title: 'Remove item?',
      text: 'Are you sure you want to remove this item?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove it'
    }).then((result) => {
      if (result.isConfirmed) {
        removeItem(id);
        Swal.fire({
          toast: true,
          icon: 'success',
          text: 'Item removed',
          position: 'bottom-end',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Your cart is empty
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {items.map((item) => (
        <Card key={item.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{item.name}</h3>
              <p className="text-sm text-gray-600">₱{item.price}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuantityUpdate(item.id, item.quantity - 1)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center">{item.quantity}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuantityUpdate(item.id, item.quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleRemoveItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <div className="mt-4 flex justify-between items-center">
        <div className="text-lg font-semibold">Total: ₱{total.toFixed(2)}</div>
        <Button href="/checkout" className="w-1/2">
          Checkout
        </Button>
      </div>
    </div>
  );
};

export default Cart;