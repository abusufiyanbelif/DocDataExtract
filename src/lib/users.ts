export const initialUsers = [
    { id: '0', name: 'Admin', phone: '0000000000', userKey: 'admin', role: 'Admin' as const, password: 'password' },
    { id: '1', name: 'Moosa Shaikh', phone: '8421708907', userKey: 'moosashaikh', role: 'User' as const, password: 'password' },
    { id: '2', name: 'Maaz Shaikh', phone: '9372145889', userKey: 'maazshaikh', role: 'User' as const, password: 'password' },
    { id: '3', name: 'Abu Rehan Bedrekar', phone: '7276224160', userKey: 'aburehanbedrekar', role: 'User' as const, password: 'password' },
    { id: '4', name: 'Abusufiya Belief', phone: '7887646583', userKey: 'abusufiyabelief', role: 'User' as const, password: 'password' },
    { id: '5', name: 'Nayyar Ahmed Karajgi', phone: '9028976036', userKey: 'nayyarahmedkarajgi', role: 'User' as const, password: 'password' },
    { id: '6', name: 'Arif Baig', phone: '9225747045', userKey: 'arifbaig', role: 'User' as const, password: 'password' },
    { id: '7', name: 'Mazhar Shaikh', phone: '8087669914', userKey: 'mazharshaikh', role: 'User' as const, password: 'password' },
    { id: '8', name: 'Mujahid Chabukswar', phone: '8087420544', userKey: 'mujahidchabukswar', role: 'User' as const, password: 'password' },
    { id: '9', name: 'Muddasir Bhairamadgi', phone: '7385557820', userKey: 'muddasirbhairamadgi', role: 'User' as const, password: 'password' },
];

export type User = (typeof initialUsers)[number];
