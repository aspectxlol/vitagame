import React from 'react'
import useStore from './store/useStore'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Trash2 } from 'lucide-react'

function randomizeGoal(): Partial<ReturnType<typeof useStore>['customers'][number]['goal']> {
  const nutritionKeys = ['protein', 'carbs', 'fat', 'sugar', 'vitamins'] as const
  const goal: Partial<Record<typeof nutritionKeys[number], number>> = {}
  const count = Math.floor(Math.random() * 2) + 1
  const shuffled = [...nutritionKeys].sort(() => 0.5 - Math.random())
  for (let i = 0; i < count; i++) {
    const key = shuffled[i]
    if (key === 'sugar') {
      goal[key] = 0
    } else {
      goal[key] = Math.floor(Math.random() * 30) + 10
    }
  }
  return goal
}

function randomCustomer() {
  const names = [
    'Alex', 'Bella', 'Chris', 'Dana', 'Eli', 'Fay', 'Gio', 'Hana', 'Ivan', 'Juno'
  ]
  const descriptions = [
    'Wants to bulk up', 'Needs more vitamins', 'Avoids sugar', 'Wants more energy', 'Needs low fat'
  ]
  const name = names[Math.floor(Math.random() * names.length)]
  const description = descriptions[Math.floor(Math.random() * descriptions.length)]
  return {
    id: Math.random().toString(36).slice(2),
    name,
    goal: randomizeGoal(),
    description,
  }
}

function calculateTip(goal: Record<string, number>, plate: Record<string, number>) {
  // If any goal is not met, tip is 0
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
      // The closer to the goal, the better (over-serving doesn't penalize)
      totalPercent += Math.min(1, want / got)
      count++
    }
  }
  if (!allMet) return 0
  // Score: 10 (barely met) to 25 (perfectly matched)
  const avgPercent = totalPercent / (count || 1)
  return Math.round(10 + 15 * avgPercent)
}

function App() {
  const {
    orders,
    activeOrderId,
    ingredients,
    methods,
    setActiveOrderId,
    addOrder,
    removeOrder,
    handleAddToPlate,
    removeFromPlate,
    finishOrder,
    setMethod,
  } = useStore()

  const [lastTip, setLastTip] = React.useState<number | null>(null)
  const [lastResult, setLastResult] = React.useState<'success' | 'fail' | null>(null)

  const activeOrder = orders.find(o => o.id === activeOrderId)

  // Calculate nutrition for active order
  const plateNutrition = React.useMemo(() => {
    if (!activeOrder) return { protein: 0, carbs: 0, fat: 0, sugar: 0, vitamins: 0 }
    const total = { protein: 0, carbs: 0, fat: 0, sugar: 0, vitamins: 0 }
    for (const ing of activeOrder.plate) {
      for (const key of Object.keys(total) as (keyof typeof total)[]) {
        total[key] += ing.cookedNutrition?.[key] || 0
      }
    }
    return total
  }, [activeOrder])

  React.useEffect(() => {
    if (orders.length === 0) addOrder(randomCustomer())
    // eslint-disable-next-line
  }, [])

  const handleFinishOrder = () => {
    if (!activeOrder) return
    finishOrder()
    const goal = activeOrder.customer.goal
    const tip = calculateTip(goal, plateNutrition)
    setLastTip(tip)
    setLastResult(tip > 0 ? 'success' : 'fail')
  }

  const handleNextOrder = () => {
    if (!activeOrder) return
    removeOrder(activeOrder.id)
    setLastTip(null)
    setLastResult(null)
    // If no more orders, add a new one
    if (orders.length <= 1) addOrder(randomCustomer())
  }

  return (
    <main className="max-w-3xl mx-auto py-8 px-2">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Nutrition Game</h1>
        <Button onClick={() => addOrder(randomCustomer())}>Add New Order</Button>
      </div>
      <div className="flex gap-4">
        {/* Orders List */}
        <div className="w-1/3">
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <ul>
                {orders.map(order => (
                  <li key={order.id} className="flex items-center justify-between mb-2">
                    <Button
                      variant={order.id === activeOrderId ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveOrderId(order.id)}
                    >
                      {order.customer.name}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove Order"
                      onClick={() => removeOrder(order.id)}
                      disabled={orders.length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        {/* Active Order Details */}
        <div className="flex-1">
          {activeOrder ? (
            <Card>
              <CardHeader>
                <CardTitle>Customer: {activeOrder.customer.name}</CardTitle>
                <CardDescription>{activeOrder.customer.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <strong>Goal:</strong>
                <ul className="list-disc ml-6 mb-4">
                  {Object.entries(activeOrder.customer.goal).map(([k, v]) => (
                    <li key={k}>
                      {k}: {v}
                    </li>
                  ))}
                </ul>
                <Separator className="my-4" />
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Ingredients</h4>
                  <div className="space-y-2">
                    {ingredients.map((ing) => (
                      <div key={ing.id} className="flex items-center gap-2">
                        <span className="w-32">{ing.name}</span>
                        <Select
                          value={methods[ing.id] || "raw"}
                          onValueChange={(val) => setMethod(ing.id, val)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="raw">Raw</SelectItem>
                            <SelectItem value="boil">Boil</SelectItem>
                            <SelectItem value="fry">Fry</SelectItem>
                            <SelectItem value="bake">Bake</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() =>
                            handleAddToPlate(ing.id, methods[ing.id] || "raw")
                          }
                        >
                          Add to Plate
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Your Plate</h4>
                  <ul className="list-disc ml-6">
                    {activeOrder.plate.map((ing, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span>
                          {ing.name} (
                          {Object.entries(ing.cookedNutrition || {})
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")}
                          )
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove"
                          onClick={() => removeFromPlate(idx)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <strong>Total Nutrition:</strong>
                  <ul className="list-disc ml-6">
                    {Object.entries(plateNutrition).map(([k, v]) => (
                      <li key={k}>
                        {k}: {v}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                {!activeOrder.fulfilled ? (
                  <Button onClick={handleFinishOrder}>Finish Order</Button>
                ) : (
                  <div className="w-full flex flex-col items-center gap-2">
                    {lastResult === 'success' && (
                      <h3 className="font-bold text-lg text-green-700">
                        Success! Order Fulfilled!<br />
                        Tip: <span className="font-mono">{lastTip}</span>
                      </h3>
                    )}
                    {lastResult === 'fail' && (
                      <h3 className="font-bold text-lg text-red-700">
                        Order Not Fulfilled. Customer leaves, no tip.
                      </h3>
                    )}
                    <Button onClick={handleNextOrder}>Next Customer</Button>
                  </div>
                )}
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <p className="text-center py-8">Select or add an order to begin.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}

export default App
