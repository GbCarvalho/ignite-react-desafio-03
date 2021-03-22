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
      const stock: Stock = (await api.get(`stock/${productId}`)).data;

      if (!stock) {
        throw new Error("Erro na adição do produto");
      }

      const tempCart = [...cart];

      const product = tempCart.find((product) => product.id === productId);

      if (!product) {
        const productData: Product | undefined = await api.get(
          `products/id=${productId}`
        );

        if (!productData) {
          throw new Error("Erro na adição do produto");
        }

        tempCart.push({ ...productData, amount: 1 });

        setCart(tempCart);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([...cart, { ...productData, amount: 1 }])
        );
      } else if (product) {
        if (stock.amount < product.amount) {
          throw new Error("Quantidade solicitada fora de estoque");
        }

        product.amount += 1;

        setCart(tempCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(tempCart));
      }
    } catch (error) {
      if (error.response) {
        toast.error("Erro na adição do produto");
      }

      toast.error(error.message);
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const tempCart = [...cart];

      const product = tempCart.find((product) => product.id === productId);

      if (!product) {
        throw new Error("Erro na remoção do produto");
      }

      const index = tempCart.findIndex((product) => product.id === productId);

      tempCart.splice(index, 1);

      setCart(tempCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(tempCart));
    } catch (error) {
      if (error.response) {
        toast.error("Erro na remoção do produto");
      }

      toast.error(error.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const tempCart = [...cart];

      if (amount <= 0) {
        throw new Error("Erro na adição do produto");
      }

      const [product] = tempCart.filter((item) => item.id === productId);

      if (!product) {
        throw new Error("Erro na adição do produto");
      }

      const stock = await api.get<Stock[]>(`/stock?id=${productId}`);

      if (!stock) {
        throw new Error("Erro na adição do produto");
      }

      if (amount > stock.data[0].amount) {
        throw new Error("Quantidade solicitada fora de estoque");
      }

      product.amount = amount;

      setCart(tempCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(tempCart));
    } catch (error) {
      if (error.response) {
        toast.error("Erro na adição do produto");
      }

      toast.error(error.message);
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
