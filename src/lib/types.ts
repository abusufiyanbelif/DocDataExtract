import type { DocumentData } from 'firebase/firestore';

export interface RationItem {
  id: string;
  name: string;
  quantity: string;
  price: number;
  notes: string;
}

export interface RationList {
  [members: string]: RationItem[];
}

export interface Campaign extends DocumentData {
  id: string;
  name: string;
  status: 'Upcoming' | 'Active' | 'Completed';
  priceDate: string;
  shopName: string;
  shopContact: string;
  shopAddress: string;
  rationLists: RationList;
}

export interface Beneficiary extends DocumentData {
    id: string;
    name: string;
    address: string;
    phone: string;
    members: number;
    earningMembers: number;
    male: number;
    female: number;
    addedDate: string;
    idProofType: string;
    idNumber: string;
    referralBy: string;
    kitAmount: number;
    status: 'Given' | 'Pending' | 'Hold' | 'Need More Details';
}
