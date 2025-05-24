import { create } from 'zustand'

// Types
type Nutrition = {
  protein: number
  carbs: number
  fat: number
  sugar: number
  vitamins: number
}

type Ingredient = {
  id: string
  name: string
  baseNutrition: Nutrition
}

type CookedIngredient = Ingredient & {
  cookedNutrition: Nutrition
}

type CustomerGoal = Partial<Nutrition>

type Customer = {
  id: string
  name: string
  goal: CustomerGoal
  description: string
}

type LocalOrder = {
  id: string
  customer: Customer
  plate: CookedIngredient[]
  fulfilled: boolean
}

type Store = {
  customers: Customer[]
  ingredients: Ingredient[]
  orders: LocalOrder[]
  activeOrderId: string | null
  methods: { [id: string]: string }
  setActiveOrderId: (id: string) => void
  addOrder: (customer: Customer) => void
  removeOrder: (id: string) => void
  handleAddToPlate: (ingredientId: string, method: string) => void
  removeFromPlate: (idx: number) => void
  finishOrder: () => void
  setMethod: (ingredientId: string, method: string) => void
}

// Nutrition modification logic for cooking methods
function cookNutrition(base: Nutrition, method: 'raw' | 'boil' | 'fry' | 'bake'): Nutrition {
  switch (method) {
    case 'boil':
      return {
        ...base,
        vitamins: base.vitamins * 0.7, // lose some vitamins
      }
    case 'fry':
      return {
        ...base,
        fat: base.fat + 5, // add oil
        vitamins: base.vitamins * 0.8,
      }
    case 'bake':
      return {
        ...base,
        vitamins: base.vitamins * 0.9,
      }
    default:
      return base
  }
}

const useStore = create<Store>((set, get) => ({
  customers: [],
  ingredients: [
    {
      id: 'chicken',
      name: 'Chicken Breast',
      baseNutrition: { protein: 25, carbs: 0, fat: 3, sugar: 0, vitamins: 2 },
    },
    {
      id: 'rice',
      name: 'Rice',
      baseNutrition: { protein: 2, carbs: 28, fat: 0, sugar: 0, vitamins: 1 },
    },
    {
      id: 'carrot',
      name: 'Carrot',
      baseNutrition: { protein: 1, carbs: 6, fat: 0, sugar: 3, vitamins: 8 },
    },
    {
      id: 'sugar',
      name: 'Sugar',
      baseNutrition: { protein: 0, carbs: 0, fat: 0, sugar: 10, vitamins: 0 },
    },
  ],
  orders: [],
  activeOrderId: null,
  methods: {},
  setActiveOrderId: (id) => set({ activeOrderId: id }),
  addOrder: (customer) =>
    set((state) => ({
      orders: [
        ...state.orders,
        {
          id: customer.id,
          customer,
          plate: [],
          fulfilled: false,
        },
      ],
      activeOrderId: customer.id,
      methods: {},
    })),
  removeOrder: (id) =>
    set((state) => {
      const filtered = state.orders.filter((o) => o.id !== id)
      let newActive = state.activeOrderId
      if (state.activeOrderId === id) {
        newActive = filtered.length > 0 ? filtered[0].id : null
      }
      return { orders: filtered, activeOrderId: newActive }
    }),
  handleAddToPlate: (ingredientId, method) =>
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === state.activeOrderId
          ? {
            ...order,
            plate: [
              ...order.plate,
              {
                ...state.ingredients.find((i) => i.id === ingredientId)!,
                cookedNutrition: cookNutrition(
                  state.ingredients.find((i) => i.id === ingredientId)!.baseNutrition,
                  method as any
                ),
                method,
              },
            ],
          }
          : order
      ),
    })),
  removeFromPlate: (idx) =>
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === state.activeOrderId
          ? { ...order, plate: order.plate.filter((_, i) => i !== idx) }
          : order
      ),
    })),
  finishOrder: () =>
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === state.activeOrderId ? { ...order, fulfilled: true } : order
      ),
    })),
  setMethod: (ingredientId, method) =>
    set((state) => ({
      methods: { ...state.methods, [ingredientId]: method },
    })),
}))

export default useStore