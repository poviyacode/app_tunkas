import { User } from "./user";

export interface Subscription {

    _id?: string;
    User? : User;
    Join?: User;
    type?: string;
    expirationDate?: number;
    daysDiffMembership?: any;
    expired: boolean;
    status?: string;
    search?: string;
    updateAt?: string;
    createdAt?: string;
}

