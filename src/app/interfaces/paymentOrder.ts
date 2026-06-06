import { Money } from "./money";
import { User } from "./user";

export interface PaymentOrder {
    _id?: string;
    codeCollection?: string;
    Sender?: User;
    Receiver?: User;
    production?: boolean;
    amountTransaction?: number;
    MoneyTransaction?: Money;
    amountPay?: number;
    MoneyPay?: Money;
    Money?: Money;
    amount?: number;
    paymentDetails?: any;
    status?: string;
    paymentType?: string;
    createdAt: string;
}