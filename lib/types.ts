export interface MenuItem {
  itemid: number;
  itemname: string;
  category: string;
  price: number;
  description: string;
}

export interface OrderItem {
  item: string;
  price: number;
  addOns: string[];
  quantity: number;
}

export interface Order {
  orderid: string;
  time: string;
  orderdetails: { items: OrderItem[] };
  price: number;
  employeeid: number | null;
  status: string;
  source: string;
  customer_name: string | null;
}
