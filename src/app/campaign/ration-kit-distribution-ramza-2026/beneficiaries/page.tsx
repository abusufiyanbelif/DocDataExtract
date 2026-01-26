'use client';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


const beneficiaries = [
    {
        id: '1',
        name: 'Saleem Khan',
        address: '123, Old City, Hyderabad',
        phone: '9876543210',
        members: 5,
        earningMembers: 1,
        male: 2,
        female: 3,
        addedDate: '2026-03-15',
        idProof: 'Aadhaar: XXXX XXXX 1234',
        referralBy: 'Local NGO',
        status: 'Given',
    },
    {
        id: '2',
        name: 'Aisha Begum',
        address: '456, New Town, Hyderabad',
        phone: '9876543211',
        members: 4,
        earningMembers: 2,
        male: 2,
        female: 2,
        addedDate: '2026-03-16',
        idProof: 'PAN: ABCDE1234F',
        referralBy: 'Masjid Committee',
        status: 'Pending',
    },
    {
        id: '3',
        name: 'Mohammed Ali',
        address: '789, Charminar, Hyderabad',
        phone: '9876543212',
        members: 6,
        earningMembers: 1,
        male: 3,
        female: 3,
        addedDate: '2026-03-17',
        idProof: 'Other: Voter ID',
        referralBy: 'Self',
        status: 'Hold',
    },
];

export default function BeneficiariesPage() {
  const campaignId = 'ration-kit-distribution-ramza-2026';
  return (
    <div className="min-h-screen bg-background text-foreground">
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">Ration Kit Distribution Ramza 2026</h1>
        </div>
        
        <div className="flex gap-2 border-b mb-4">
            <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                <Link href={`/campaign/${campaignId}`}>Ration Details</Link>
            </Button>
            <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary" data-active="true">
                <Link href={`/campaign/${campaignId}/beneficiaries`}>Beneficiary List</Link>
            </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Beneficiary List 2026</CardTitle>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Beneficiary
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead className="text-center">Members</TableHead>
                          <TableHead className="text-center">Earning</TableHead>
                          <TableHead className="text-center">M/F</TableHead>
                          <TableHead>Added Date</TableHead>
                          <TableHead>ID Proof</TableHead>
                          <TableHead>Referred By</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {beneficiaries.map((beneficiary) => (
                          <TableRow key={beneficiary.id}>
                              <TableCell className="font-medium">{beneficiary.name}</TableCell>
                              <TableCell>{beneficiary.address}</TableCell>
                              <TableCell>{beneficiary.phone}</TableCell>
                              <TableCell className="text-center">{beneficiary.members}</TableCell>
                              <TableCell className="text-center">{beneficiary.earningMembers}</TableCell>
                              <TableCell className="text-center">{beneficiary.male}/{beneficiary.female}</TableCell>
                              <TableCell>{beneficiary.addedDate}</TableCell>
                              <TableCell>{beneficiary.idProof}</TableCell>
                              <TableCell>{beneficiary.referralBy}</TableCell>
                              <TableCell>
                                  <Badge variant={
                                      beneficiary.status === 'Given' ? 'default' :
                                      beneficiary.status === 'Pending' ? 'secondary' : 'destructive'
                                  }>{beneficiary.status}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon">
                                              <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                          <DropdownMenuItem>
                                              <Edit className="mr-2 h-4 w-4" />
                                              Edit
                                          </DropdownMenuItem>
                                          <DropdownMenuItem className="text-destructive focus:bg-destructive/20 focus:text-destructive">
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              Delete
                                          </DropdownMenuItem>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                              </TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
