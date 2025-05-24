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
  plateNutrition: Nutrition
}

type Store = {
  customers: Customer[]
  ingredients: Ingredient[]
  orders: LocalOrder[]
  activeOrderId: string | null
  methods: { [id: string]: string }
  tipJar: number
  lastTip: number | null
  lastResult: 'success' | 'fail' | null
  setActiveOrderId: (id: string) => void
  addOrder: (customer: Customer) => void
  removeOrder: (id: string) => void
  handleAddToPlate: (ingredientId: string, method: string) => void
  removeFromPlate: (idx: number) => void
  finishOrder: () => void
  setMethod: (ingredientId: string, method: string) => void
  resetResult: () => void
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

function calculateTip(goal: Record<string, number>, plate: Record<string, number>) {
  let allMet = true
  let totalPercent = 0
  let count = 0
  for (const key in goal) {
    if (key === 'sugar') {
      if (plate.sugar > 0) {
        allMet = false
        break
      } else {
        totalPercent += 1
        count++
      }
    } else {
      const want = goal[key] ?? 0
      const got = plate[key] ?? 0
      if (got < want) {
        allMet = false
        break
      }
      totalPercent += Math.min(1, want / got)
      count++
    }
  }
  if (!allMet) return 0
  const avgPercent = totalPercent / (count || 1)
  return Math.round(10 + 15 * avgPercent)
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
  tipJar: 0,
  lastTip: null,
  lastResult: null,
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
          plateNutrition: { protein: 0, carbs: 0, fat: 0, sugar: 0, vitamins: 0 },
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
    set((state) => {
      const ingredient = state.ingredients.find((i) => i.id === ingredientId)!
      const cookedNutrition = cookNutrition(ingredient.baseNutrition, method as any)
      return {
        orders: state.orders.map((order) =>
          order.id === state.activeOrderId
            ? {
              ...order,
              plate: [
                ...order.plate,
                {
                  ...ingredient,
                  cookedNutrition,
                  method,
                },
              ],
              plateNutrition: order.plate
                .concat([{ ...ingredient, cookedNutrition }])
                .reduce(
                  (acc, ing) => {
                    for (const key in acc) {
                      acc[key as keyof typeof acc] += ing.cookedNutrition[key as keyof typeof acc] || 0
                    }
                    return acc
                  },
                  { protein: 0, carbs: 0, fat: 0, sugar: 0, vitamins: 0 }
                ),
            }
            : order
        ),
      }
    }),
  removeFromPlate: (idx) =>
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === state.activeOrderId
          ? {
            ...order,
            plate: order.plate.filter((_, i) => i !== idx),
            plateNutrition: order.plate
              .filter((_, i) => i !== idx)
              .reduce(
                (acc, ing) => {
                  for (const key in acc) {
                    acc[key as keyof typeof acc] += ing.cookedNutrition[key as keyof typeof acc] || 0
                  }
                  return acc
                },
                { protein: 0, carbs: 0, fat: 0, sugar: 0, vitamins: 0 }
              ),
          }
          : order
      ),
    })),
  finishOrder: () =>
    set((state) => {
      const order = state.orders.find((o) => o.id === state.activeOrderId)
      if (!order) return {}
      const tip = calculateTip(order.customer.goal, order.plateNutrition)
      return {
        orders: state.orders.map((o) =>
          o.id === state.activeOrderId ? { ...o, fulfilled: true } : o
        ),
        tipJar: tip > 0 ? state.tipJar + tip : state.tipJar,
        lastTip: tip > 0 ? tip : 0,
        lastResult: tip > 0 ? 'success' : 'fail',
      }
    }),
  setMethod: (ingredientId, method) =>
    set((state) => ({
      methods: { ...state.methods, [ingredientId]: method },
    })),
  resetResult: () => set({ lastTip: null, lastResult: null }),
}))

export default useStore