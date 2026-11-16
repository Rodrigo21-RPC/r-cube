import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Código de cupón que el cliente escribió (HU-49). Solo se guarda el texto: el descuento lo calcula siempre el
 * servidor en cada cotización, y un visitante lo conserva hasta iniciar sesión.
 */
interface CouponState {
  code: string;
  setCode: (code: string) => void;
  clear: () => void;
}

export const useCouponStore = create<CouponState>()(
  persist(
    (set) => ({
      code: "",
      setCode: (code) => set({ code: code.trim().toUpperCase() }),
      clear: () => set({ code: "" }),
    }),
    { name: "rcube-cupon", version: 1 },
  ),
);
