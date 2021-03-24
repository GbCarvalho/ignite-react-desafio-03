import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productIndex = cart.findIndex(
        (product) => product.id === productId
      );
      const tmpCart = cart;
      const stock = (await api.get(`/stock/${productId}`)).data;

      if (productIndex === -1) {
        if (stock.amount <= 0) {
          throw Error("Quantidade solicitada fora de estoque");
        }

        const productData = (await api.get(`/products/${productId}`)).data;

        const newProduct = { ...productData, amount: 1 };

        setCart([...tmpCart, newProduct]);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([...tmpCart, newProduct])
        );
      } else {
        if (stock.amount <= tmpCart[productIndex].amount) {
          throw Error("Quantidade solicitada fora de estoque");
        }

        tmpCart[productIndex].amount += 1;

        setCart([...tmpCart]);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify([...tmpCart]));
      }
    } catch (error) {
      if (error.response) {
        toast.error("Erro na adição do produto");
      }

      toast.error(error.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const tempCart = [...cart];

      const index = tempCart.findIndex((product) => product.id === productId);

      if (index === -1) {
        throw Error();
      }

      tempCart.splice(index, 1);

      setCart(tempCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(tempCart));
    } catch (error) {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const tmpCart = cart;
      const cartProductIndex = cart.findIndex((product) => {
        return product.id === productId;
      });

      const stock = (await api.get<Stock>(`stock/${productId}`)).data;

      if (amount <= stock.amount && amount >= 1) {
        tmpCart[cartProductIndex].amount = amount;
        setCart([...tmpCart]);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify([...tmpCart]));
      } else {
        toast.error("Quantidade solicitada fora de estoque");
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
