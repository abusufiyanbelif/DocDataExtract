
import type { DocumentData } from 'firebase/firestore';
import type { UserPermissions } from './modules';

export interface BrandingSettings extends DocumentData {
  logoUrl?: string;
  logoWidth?: number;
  logoHeight?: number;
}

export interface PaymentSettings extends DocumentData {
  qrCodeUrl?: string;
  qrWidth?: number;
  qrHeight?: number;
  upiId?: string;
  paymentMobileNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface CampaignDocument {
  name: string;
  url: string;
  isPublic: boolean;
}

export interface RationItem {
  id: string;
  name: string;
  quantity: number;
  quantityType?: string;
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
  documents?: CampaignDocument[];
  rationLists: RationList;
  createdAt?: any;
  createdById?: string;
  createdByName?: string;
}

export interface Lead extends DocumentData {
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
  documents?: CampaignDocument[];
  rationLists: RationList;
  createdAt?: any;
  createdById?: string;
  createdByName?: string;
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
    idProofIsPublic?: boolean;
    createdAt?: any;
    createdById?: string;
    createdByName?: string;
}

export interface UserProfile extends DocumentData {
  id: string;
  name: string;
  email: string;
  phone: string;
  loginId: string;
  userKey: string;
  role: 'Admin' | 'User';
  status: 'Active' | 'Inactive';
  permissions?: UserPermissions;
  idProofType?: string;
  idNumber?: string;
  idProofUrl?: string;
  createdAt?: any;
  createdById?: string;
  createdByName?: string;
}

export interface Donation extends DocumentData {
  id: string;
  donorName: string;
  donorPhone: string;
  receiverName: string;
  amount: number;
  type: 'Zakat' | 'Sadqa' | 'Interest' | 'Lillah' | 'General';
  donationType: 'Cash' | 'Online Payment' | 'Check' | 'Other';
  referral: string;
  donationDate: string;
  status: 'Verified' | 'Pending' | 'Canceled';
  transactionId?: string;
  screenshotUrl?: string;
  screenshotIsPublic?: boolean;
  uploadedBy: string;
  uploadedById: string;
  campaignId: string;
  campaignName: string;
  createdAt?: any;
}
