
// Auto-generated types for products
export interface productsSelect {
  id: number
  name: string
  price: any
  available: boolean
}

export interface productsInsert {
  name: string
  price: any
  available: boolean
}

export type productsUpdate = Partial<Omit<productsInsert, 'id'>> & { id: number };
  