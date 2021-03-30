import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productAlreadyInCart = updatedCart.find(
        (product) => product.id === productId
      );

      const stock = await api.get(`stock/${productId}`);

      const amountProductInStock = stock.data.amount;
      const currentAmount = productAlreadyInCart
        ? productAlreadyInCart.amount
        : 0;
      const amount = currentAmount + 1;

      if (amount > amountProductInStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productAlreadyInCart) {
        productAlreadyInCart.amount = amount;
      } else {
        const { data } = await api.get(`products/${productId}`);
        const product = { ...data, amount: 1 };
        updatedCart.push(product);
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productIndex = updatedCart.findIndex((product) => product.id === productId);

      if(productIndex === -1) {
        throw Error();
      }

      updatedCart.splice(productIndex, 1)

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (!amount) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const stock = await api.get(`stock/${productId}`);

      const amountProductInStock = stock.data.amount;

      if(amount > amountProductInStock){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.map((product) => {
        if(product.id === productId) {
          return {
            ...product,
            amount
          }
        }

        return product;
      });

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
