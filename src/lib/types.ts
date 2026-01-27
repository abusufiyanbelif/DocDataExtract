import type { DocumentData } from 'firebase/firestore';
import type { UserPermissions } from './modules';

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
  category: 'Ration' | 'Relief' | 'General';
  description?: string;
  targetAmount?: number;
  startDate: string;
  endDate: string;
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
    status: 'Given' | 'Pending' | 'Hold' | 'Need More Details' | 'Verified';
    idProofUrl?: string;
}

export interface UserProfile extends DocumentData {
  id: string;
  name: string;
  phone: string;
  loginId: string;
  userKey: string;
  role: 'Admin' | 'User';
  status: 'Active' | 'Inactive';
  permissions?: UserPermissions;
}

export interface Donation extends DocumentData {
  id: string;
  donorName: string;
  donorPhone: string;
  amount: number;
  type: 'Zakat' | 'Sadqa' | 'Interest' | 'Lillah' | 'General';
  donationDate: string;
  status: 'Verified' | 'Pending';
  screenshotUrl?: string;
  uploadedBy: string;
  uploadedById: string;
  campaignId: string;
  campaignName: string;
}
