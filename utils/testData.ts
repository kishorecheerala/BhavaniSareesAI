
import { AppState } from '../context/AppContext';
import { ProfileData, Customer, Supplier, Product, Purchase, Sale, Return } from '../types';

// Utility to create dates relative to today
const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const daysFromNow = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
};

export const testProfile: ProfileData = {
  id: 'userProfile',
  name: 'My Business',
  ownerName: 'Owner Name',
  phone: '9876543210',
  address: '123 Market Street, City, 500001',
  gstNumber: '36ABCDE1234F1Z5',
};

const customers: Customer[] = [
    { id: 'CUST-001', name: 'Aaradhya Rao', phone: '9876543210', address: '1-101, Kukatpally', area: 'Kukatpally', reference: 'Friend' },
    { id: 'CUST-002', name: 'Bhavna Reddy', phone: '9876543211', address: '2-202, Ameerpet', area: 'Ameerpet' },
    { id: 'CUST-003', name: 'Charvi Patel', phone: '9876543212', address: '3-303, Jubilee Hills', area: 'Jubilee Hills' },
    { id: 'CUST-004', name: 'Devika Singh', phone: '9876543213', address: '4-404, Gachibowli', area: 'Gachibowli' },
    { id: 'CUST-005', name: 'Esha Gupta', phone: '9876543214', address: '5-505, Madhapur', area: 'Madhapur' },
    { id: 'CUST-006', name: 'Gauri Sharma', phone: '9876543215', address: '6-606, Secunderabad', area: 'Secunderabad' },
    { id: 'CUST-007', name: 'Ishani Mehta', phone: '9876543216', address: '7-707, Hitech City', area: 'Hitech City' },
    { id: 'CUST-008', name: 'Jiya Kumar', phone: '9876543217', address: '8-808, Kondapur', area: 'Kondapur' },
    { id: 'CUST-009', name: 'Kavya Verma', phone: '9876543218', address: '9-909, Miyapur', area: 'Miyapur' },
    { id: 'CUST-010', name: 'Lavanya Agarwal', phone: '9876543219', address: '10-101, Banjara Hills', area: 'Banjara Hills' },
    { id: 'CUST-011', name: 'Myra Mishra', phone: '9876543220', address: '11-111, Kukatpally', area: 'Kukatpally' },
    { id: 'CUST-012', name: 'Navya Jain', phone: '9876543221', address: '12-121, Ameerpet', area: 'Ameerpet' },
    { id: 'CUST-013', name: 'Pari Khan', phone: '9876543222', address: '13-131, Jubilee Hills', area: 'Jubilee Hills' },
    { id: 'CUST-014', name: 'Ria Lal', phone: '9876543223', address: '14-141, Gachibowli', area: 'Gachibowli' },
    { id: 'CUST-015', name: 'Saanvi Yadav', phone: '9876543224', address: '15-151, Madhapur', area: 'Madhapur' },
    { id: 'CUST-016', name: 'Tara Reddy', phone: '9876543225', address: '16-161, Secunderabad', area: 'Secunderabad' },
    { id: 'CUST-017', name: 'Vanya Patel', phone: '9876543226', address: '17-171, Hitech City', area: 'Hitech City' },
    { id: 'CUST-018', name: 'Anika Rao', phone: '9876543227', address: '18-181, Kondapur', area: 'Kondapur' },
    { id: 'CUST-019', name: 'Anvi Gupta', phone: '9876543228', address: '19-191, Miyapur', area: 'Miyapur' },
    { id: 'CUST-020', name: 'Diya Sharma', phone: '9876543229', address: '20-201, Banjara Hills', area: 'Banjara Hills' },
    { id: 'CUST-021', name: 'Khushi Singh', phone: '9876543230', address: '21-211, Kukatpally', area: 'Kukatpally' },
    { id: 'CUST-022', name: 'Mahika Kumar', phone: '9876543231', address: '22-221, Ameerpet', area: 'Ameerpet' },
    { id: 'CUST-023', name: 'Nitya Mehta', phone: '9876543232', address: '23-231, Jubilee Hills', area: 'Jubilee Hills' },
    { id: 'CUST-024', name: 'Prisha Verma', phone: '9876543233', address: '24-241, Gachibowli', area: 'Gachibowli' },
    { id: 'CUST-025', name: 'Samaira Agarwal', phone: '9876543234', address: '25-251, Madhapur', area: 'Madhapur' },
    { id: 'CUST-026', name: 'Shreya Mishra', phone: '9876543235', address: '26-261, Secunderabad', area: 'Secunderabad' },
    { id: 'CUST-027', name: 'Siya Jain', phone: '9876543236', address: '27-271, Hitech City', area: 'Hitech City' },
    { id: 'CUST-028', name: 'Suhana Khan', phone: '9876543237', address: '28-281, Kondapur', area: 'Kondapur' },
    { id: 'CUST-029', name: 'Vidya Lal', phone: '9876543238', address: '29-291, Miyapur', area: 'Miyapur' },
    { id: 'CUST-030', name: 'Zara Yadav', phone: '9876543239', address: '30-301, Banjara Hills', area: 'Banjara Hills' },
    { id: 'CUST-031', name: 'Amrita Reddy', phone: '9876543240', address: '31-311, Kukatpally', area: 'Kukatpally' },
    { id: 'CUST-032', name: 'Ananya Patel', phone: '9876543241', address: '32-321, Ameerpet', area: 'Ameerpet' },
    { id: 'CUST-033', name: 'Avani Rao', phone: '9876543242', address: '33-331, Jubilee Hills', area: 'Jubilee Hills' },
    { id: 'CUST-034', name: 'Ira Gupta', phone: '9876543243', address: '34-341, Gachibowli', area: 'Gachibowli' },
    { id: 'CUST-035', name: 'Sara Sharma', phone: '9876543244', address: '35-351, Madhapur', area: 'Madhapur' },
    { id: 'CUST-036', name: 'Yamini Singh', phone: '9876543245', address: '36-361, Secunderabad', area: 'Secunderabad' },
    { id: 'CUST-037', name: 'Anika Kumar', phone: '9876543246', address: '37-371, Hitech City', area: 'Hitech City' },
    { id: 'CUST-038', name: 'Diya Mehta', phone: '9876543247', address: '38-381, Kondapur', area: 'Kondapur' },
    { id: 'CUST-039', name: 'Gauri Verma', phone: '9876543248', address: '39-391, Miyapur', area: 'Miyapur' },
    { id: 'CUST-040', name: 'Ishani Agarwal', phone: '9876543249', address: '40-401, Banjara Hills', area: 'Banjara Hills' },
    { id: 'CUST-041', name: 'Jiya Mishra', phone: '9876543250', address: '41-411, Kukatpally', area: 'Kukatpally' },
    { id: 'CUST-042', name: 'Kavya Jain', phone: '9876543251', address: '42-421, Ameerpet', area: 'Ameerpet' },
    { id: 'CUST-043', name: 'Lavanya Khan', phone: '9876543252', address: '43-431, Jubilee Hills', area: 'Jubilee Hills' },
    { id: 'CUST-044', name: 'Mahika Lal', phone: '9876543253', address: '44-441, Gachibowli', area: 'Gachibowli' },
    { id: 'CUST-045', name: 'Myra Yadav', phone: '9876543254', address: '45-451, Madhapur', area: 'Madhapur' },
    { id: 'CUST-046', name: 'Navya Reddy', phone: '9876543255', address: '46-461, Secunderabad', area: 'Secunderabad' },
    { id: 'CUST-047', name: 'Pari Patel', phone: '9876543256', address: '47-471, Hitech City', area: 'Hitech City' },
    { id: 'CUST-048', name: 'Ria Rao', phone: '9876543257', address: '48-481, Kondapur', area: 'Kondapur' },
    { id: 'CUST-049', name: 'Saanvi Gupta', phone: '9876543258', address: '49-491, Miyapur', area: 'Miyapur' },
    { id: 'CUST-050', name: 'Tara Sharma', phone: '9876543259', address: '50-501, Banjara Hills', area: 'Banjara Hills' },
];

const suppliers: Supplier[] = [
    { id: 'SUPP-001', name: 'Surat Weavers Guild', phone: '8887776661', location: 'Surat', gstNumber: '24AAAAA0000A1Z5' },
    { id: 'SUPP-002', name: 'Kanchi Silks Emporium', phone: '8887776662', location: 'Kanchipuram', gstNumber: '33BBBBB0000B1Z5' },
    { id: 'SUPP-003', name: 'Varanasi Brocades Ltd', phone: '8887776663', location: 'Varanasi', gstNumber: '09CCCCC0000C1Z5' },
    { id: 'SUPP-004', name: 'Jaipur Prints Co.', phone: '8887776664', location: 'Jaipur', gstNumber: '08DDDDD0000D1Z5' },
    { id: 'SUPP-005', name: 'Kolkata Cottons', phone: '8887776665', location: 'Kolkata', gstNumber: '19EEEEE0000E1Z5' },
    { id: 'SUPP-006', name: 'Mysore Silk Creations', phone: '8887776666', location: 'Mysore', gstNumber: '29FFFFF0000F1Z5' },
    { id: 'SUPP-007', name: 'Coimbatore Fabrics', phone: '8887776667', location: 'Coimbatore', gstNumber: '33GGGGG0000G1Z5' },
    { id: 'SUPP-008', name: 'Bhagalpur Tussar House', phone: '8887776668', location: 'Bhagalpur', gstNumber: '10HHHHH0000H1Z5' },
    { id: 'SUPP-009', name: 'Pochampally Ikat Art', phone: '8887776669', location: 'Pochampally', gstNumber: '36IIIII0000I1Z5' },
    { id: 'SUPP-010', name: 'Modern Synthetics Inc.', phone: '8887776670', location: 'Mumbai', gstNumber: '27JJJJJ0000J1Z5' },
];

const products: Product[] = [
    // Kanchi Pattu - 10
    { id: 'BS-KAN-001', name: 'Kanchi Pattu - Peacock Blue', quantity: 18, purchasePrice: 4000, salePrice: 6500, gstPercent: 5 },
    { id: 'BS-KAN-002', name: 'Kanchi Pattu - Ruby Red', quantity: 9, purchasePrice: 4200, salePrice: 7000, gstPercent: 5 },
    { id: 'BS-KAN-003', name: 'Kanchi Pattu - Emerald Green', quantity: 10, purchasePrice: 4100, salePrice: 6800, gstPercent: 5 },
    { id: 'BS-KAN-004', name: 'Kanchi Pattu - Golden Yellow', quantity: 15, purchasePrice: 3900, salePrice: 6400, gstPercent: 5 },
    { id: 'BS-KAN-005', name: 'Kanchi Pattu - Royal Purple', quantity: 12, purchasePrice: 4500, salePrice: 7500, gstPercent: 5 },
    { id: 'BS-KAN-006', name: 'Kanchi Pattu - Bridal Edition', quantity: 5, purchasePrice: 8000, salePrice: 15000, gstPercent: 5 },
    { id: 'BS-KAN-007', name: 'Kanchi Pattu - Silver Zari', quantity: 8, purchasePrice: 5500, salePrice: 9000, gstPercent: 5 },
    { id: 'BS-KAN-008', name: 'Kanchi Pattu - Temple Border', quantity: 13, purchasePrice: 4800, salePrice: 8000, gstPercent: 5 },
    { id: 'BS-KAN-009', name: 'Kanchi Pattu - Mango Motif', quantity: 11, purchasePrice: 4300, salePrice: 7200, gstPercent: 5 },
    { id: 'BS-KAN-010', name: 'Kanchi Pattu - Half White', quantity: 14, purchasePrice: 4000, salePrice: 6600, gstPercent: 5 },
    // Chettinad Cotton - 10
    { id: 'BS-COT-001', name: 'Chettinad Cotton - Mustard', quantity: 23, purchasePrice: 800, salePrice: 1500, gstPercent: 5 },
    { id: 'BS-COT-002', name: 'Chettinad Cotton - Indigo', quantity: 30, purchasePrice: 850, salePrice: 1600, gstPercent: 5 },
    { id: 'BS-COT-003', name: 'Chettinad Cotton - Maroon Checks', quantity: 25, purchasePrice: 900, salePrice: 1700, gstPercent: 5 },
    { id: 'BS-COT-004', name: 'Chettinad Cotton - Bottle Green', quantity: 28, purchasePrice: 820, salePrice: 1550, gstPercent: 5 },
    { id: 'BS-COT-005', name: 'Chettinad Cotton - Black & Red', quantity: 20, purchasePrice: 950, salePrice: 1800, gstPercent: 5 },
    { id: 'BS-COT-006', name: 'Chettinad Cotton - Off-White', quantity: 35, purchasePrice: 750, salePrice: 1400, gstPercent: 5 },
    { id: 'BS-COT-007', name: 'Chettinad Cotton - Pink Stripes', quantity: 22, purchasePrice: 880, salePrice: 1650, gstPercent: 5 },
    { id: 'BS-COT-008', name: 'Chettinad Cotton - Grey', quantity: 18, purchasePrice: 800, salePrice: 1500, gstPercent: 5 },
    { id: 'BS-COT-009', name: 'Chettinad Cotton - Orange', quantity: 26, purchasePrice: 830, salePrice: 1580, gstPercent: 5 },
    { id: 'BS-COT-010', name: 'Chettinad Cotton - Blue Checks', quantity: 32, purchasePrice: 920, salePrice: 1750, gstPercent: 5 },
    // Mysore Silk - 10
    { id: 'BS-SILK-001', name: 'Mysore Silk - Royal Green', quantity: 14, purchasePrice: 2500, salePrice: 4500, gstPercent: 5 },
    { id: 'BS-SILK-002', name: 'Mysore Silk - Classic Pink', quantity: 18, purchasePrice: 2600, salePrice: 4700, gstPercent: 5 },
    { id: 'BS-SILK-003', name: 'Mysore Silk - Deep Blue', quantity: 12, purchasePrice: 2550, salePrice: 4600, gstPercent: 5 },
    { id: 'BS-SILK-004', name: 'Mysore Silk - Elegant Black', quantity: 10, purchasePrice: 2800, salePrice: 5000, gstPercent: 5 },
    { id: 'BS-SILK-005', name: 'Mysore Silk - Bright Red', quantity: 15, purchasePrice: 2700, salePrice: 4800, gstPercent: 5 },
    { id: 'BS-SILK-006', name: 'Mysore Silk - Light Blue', quantity: 20, purchasePrice: 2400, salePrice: 4300, gstPercent: 5 },
    { id: 'BS-SILK-007', name: 'Mysore Silk - Parrot Green', quantity: 13, purchasePrice: 2650, salePrice: 4750, gstPercent: 5 },
    { id: 'BS-SILK-008', name: 'Mysore Silk - Cream & Gold', quantity: 16, purchasePrice: 2900, salePrice: 5200, gstPercent: 5 },
    { id: 'BS-SILK-009', name: 'Mysore Silk - Orange Zari', quantity: 11, purchasePrice: 2750, salePrice: 4900, gstPercent: 5 },
    { id: 'BS-SILK-010', name: 'Mysore Silk - Purple', quantity: 14, purchasePrice: 2850, salePrice: 5100, gstPercent: 5 },
    // Synthetics - 10
    { id: 'BS-SYN-001', name: 'Synthetic Georgette - Floral', quantity: 27, purchasePrice: 500, salePrice: 950, gstPercent: 12 },
    { id: 'BS-SYN-002', name: 'Synthetic Crepe - Polka Dots', quantity: 35, purchasePrice: 450, salePrice: 850, gstPercent: 12 },
    { id: 'BS-SYN-003', name: 'Synthetic Chiffon - Abstract', quantity: 40, purchasePrice: 400, salePrice: 750, gstPercent: 12 },
    { id: 'BS-SYN-004', name: 'Synthetic Satin - Plain Black', quantity: 30, purchasePrice: 550, salePrice: 1050, gstPercent: 12 },
    { id: 'BS-SYN-005', name: 'Synthetic Organza - Embroidery', quantity: 25, purchasePrice: 600, salePrice: 1200, gstPercent: 12 },
    { id: 'BS-SYN-006', name: 'Synthetic Georgette - Blue', quantity: 28, purchasePrice: 520, salePrice: 980, gstPercent: 12 },
    { id: 'BS-SYN-007', name: 'Synthetic Crepe - Red', quantity: 33, purchasePrice: 480, salePrice: 900, gstPercent: 12 },
    { id: 'BS-SYN-008', name: 'Synthetic Chiffon - Green', quantity: 38, purchasePrice: 420, salePrice: 800, gstPercent: 12 },
    { id: 'BS-SYN-009', name: 'Synthetic Satin - Gold', quantity: 28, purchasePrice: 580, salePrice: 1100, gstPercent: 12 },
    { id: 'BS-SYN-010', name: 'Synthetic Organza - White', quantity: 22, purchasePrice: 620, salePrice: 1250, gstPercent: 12 },
    // Banarasi - 10
    { id: 'BS-BAN-001', name: 'Banarasi Silk - Red Bridal', quantity: 8, purchasePrice: 6000, salePrice: 11000, gstPercent: 5 },
    { id: 'BS-BAN-002', name: 'Banarasi Silk - Blue & Gold', quantity: 12, purchasePrice: 5500, salePrice: 10000, gstPercent: 5 },
    { id: 'BS-BAN-003', name: 'Banarasi Katan Silk - Pink', quantity: 10, purchasePrice: 6500, salePrice: 12000, gstPercent: 5 },
    { id: 'BS-BAN-004', name: 'Banarasi Organza - Floral', quantity: 15, purchasePrice: 4000, salePrice: 7500, gstPercent: 5 },
    { id: 'BS-BAN-005', name: 'Banarasi Georgette - Green', quantity: 13, purchasePrice: 4500, salePrice: 8500, gstPercent: 5 },
    { id: 'BS-BAN-006', name: 'Banarasi Tussar - Beige', quantity: 11, purchasePrice: 5000, salePrice: 9500, gstPercent: 5 },
    { id: 'BS-BAN-007', name: 'Banarasi Dupion - Purple', quantity: 9, purchasePrice: 5200, salePrice: 9800, gstPercent: 5 },
    { id: 'BS-BAN-008', name: 'Banarasi Shhattir - Yellow', quantity: 14, purchasePrice: 3800, salePrice: 7000, gstPercent: 5 },
    { id: 'BS-BAN-009', name: 'Banarasi Jangla - Black', quantity: 7, purchasePrice: 7000, salePrice: 13000, gstPercent: 5 },
    { id: 'BS-BAN-010', name: 'Banarasi Tanchoi - Maroon', quantity: 10, purchasePrice: 5800, salePrice: 10500, gstPercent: 5 },
    // Pochampally - 10
    { id: 'BS-POC-001', name: 'Pochampally Ikat - Double Weave', quantity: 10, purchasePrice: 3500, salePrice: 6000, gstPercent: 5 },
    { id: 'BS-POC-002', name: 'Pochampally Cotton - Geometric', quantity: 20, purchasePrice: 1200, salePrice: 2200, gstPercent: 5 },
    { id: 'BS-POC-003', name: 'Pochampally Silk - Red & White', quantity: 15, purchasePrice: 3000, salePrice: 5500, gstPercent: 5 },
    { id: 'BS-POC-004', name: 'Pochampally Ikat - Blue', quantity: 12, purchasePrice: 3600, salePrice: 6200, gstPercent: 5 },
    { id: 'BS-POC-005', name: 'Pochampally Cotton - Black', quantity: 18, purchasePrice: 1300, salePrice: 2400, gstPercent: 5 },
    { id: 'BS-POC-006', name: 'Pochampally Silk - Green', quantity: 13, purchasePrice: 3200, salePrice: 5800, gstPercent: 5 },
    { id: 'BS-POC-007', name: 'Pochampally Ikat - Yellow', quantity: 11, purchasePrice: 3400, salePrice: 5900, gstPercent: 5 },
    { id: 'BS-POC-008', name: 'Pochampally Cotton - Pink', quantity: 22, purchasePrice: 1250, salePrice: 2300, gstPercent: 5 },
    { id: 'BS-POC-009', name: 'Pochampally Silk - Orange', quantity: 14, purchasePrice: 3100, salePrice: 5600, gstPercent: 5 },
    { id: 'BS-POC-010', name: 'Pochampally Ikat - Maroon', quantity: 9, purchasePrice: 3700, salePrice: 6400, gstPercent: 5 },
    // Gadwal - 10
    { id: 'BS-GAD-001', name: 'Gadwal Silk Cotton - Purple', quantity: 12, purchasePrice: 2800, salePrice: 5000, gstPercent: 5 },
    { id: 'BS-GAD-002', name: 'Gadwal Pattu - Green & Red', quantity: 10, purchasePrice: 3200, salePrice: 5800, gstPercent: 5 },
    { id: 'BS-GAD-003', name: 'Gadwal Cotton - Blue Checks', quantity: 18, purchasePrice: 1500, salePrice: 2800, gstPercent: 5 },
    { id: 'BS-GAD-004', name: 'Gadwal Sico - Pink Border', quantity: 14, purchasePrice: 2500, salePrice: 4500, gstPercent: 5 },
    { id: 'BS-GAD-005', name: 'Gadwal Silk - Yellow', quantity: 11, purchasePrice: 3000, salePrice: 5500, gstPercent: 5 },
    { id: 'BS-GAD-006', name: 'Gadwal Silk Cotton - Black', quantity: 13, purchasePrice: 2900, salePrice: 5200, gstPercent: 5 },
    { id: 'BS-GAD-007', name: 'Gadwal Pattu - Orange', quantity: 9, purchasePrice: 3300, salePrice: 6000, gstPercent: 5 },
    { id: 'BS-GAD-008', name: 'Gadwal Cotton - Green Stripes', quantity: 20, purchasePrice: 1600, salePrice: 3000, gstPercent: 5 },
    { id: 'BS-GAD-009', name: 'Gadwal Sico - Blue Pallu', quantity: 15, purchasePrice: 2600, salePrice: 4700, gstPercent: 5 },
    { id: 'BS-GAD-010', name: 'Gadwal Silk - Red', quantity: 10, purchasePrice: 3100, salePrice: 5600, gstPercent: 5 },
    // Chanderi - 10
    { id: 'BS-CHA-001', name: 'Chanderi Silk Cotton - Pastel Green', quantity: 15, purchasePrice: 1800, salePrice: 3200, gstPercent: 5 },
    { id: 'BS-CHA-002', name: 'Chanderi Pattu - Golden Buttis', quantity: 12, purchasePrice: 2200, salePrice: 4000, gstPercent: 5 },
    { id: 'BS-CHA-003', name: 'Chanderi Cotton - White', quantity: 20, purchasePrice: 1400, salePrice: 2500, gstPercent: 5 },
    { id: 'BS-CHA-004', name: 'Chanderi Tissue Silk - Silver', quantity: 10, purchasePrice: 2500, salePrice: 4500, gstPercent: 5 },
    { id: 'BS-CHA-005', name: 'Chanderi Silk - Pink', quantity: 13, purchasePrice: 2000, salePrice: 3600, gstPercent: 5 },
    { id: 'BS-CHA-006', name: 'Chanderi Silk Cotton - Blue', quantity: 16, purchasePrice: 1900, salePrice: 3400, gstPercent: 5 },
    { id: 'BS-CHA-007', name: 'Chanderi Pattu - Red', quantity: 11, purchasePrice: 2300, salePrice: 4200, gstPercent: 5 },
    { id: 'BS-CHA-008', name: 'Chanderi Cotton - Yellow', quantity: 22, purchasePrice: 1500, salePrice: 2700, gstPercent: 5 },
    { id: 'BS-CHA-009', name: 'Chanderi Tissue Silk - Gold', quantity: 9, purchasePrice: 2600, salePrice: 4700, gstPercent: 5 },
    { id: 'BS-CHA-010', name: 'Chanderi Silk - Black', quantity: 14, purchasePrice: 2100, salePrice: 3800, gstPercent: 5 },
    // Tussar Silk - 10
    { id: 'BS-TUS-001', name: 'Tussar Silk - Natural Beige', quantity: 12, purchasePrice: 2500, salePrice: 4500, gstPercent: 5 },
    { id: 'BS-TUS-002', name: 'Tussar Silk - Kalamkari Print', quantity: 10, purchasePrice: 3000, salePrice: 5500, gstPercent: 5 },
    { id: 'BS-TUS-003', name: 'Tussar Ghicha - Maroon', quantity: 15, purchasePrice: 2200, salePrice: 4000, gstPercent: 5 },
    { id: 'BS-TUS-004', name: 'Tussar Silk - Hand Painted', quantity: 8, purchasePrice: 3500, salePrice: 6500, gstPercent: 5 },
    { id: 'BS-TUS-005', name: 'Tussar Silk - Blue Border', quantity: 13, purchasePrice: 2600, salePrice: 4800, gstPercent: 5 },
    { id: 'BS-TUS-006', name: 'Tussar Silk - Plain Green', quantity: 14, purchasePrice: 2400, salePrice: 4300, gstPercent: 5 },
    { id: 'BS-TUS-007', name: 'Tussar Silk - Block Print', quantity: 11, purchasePrice: 2800, salePrice: 5200, gstPercent: 5 },
    { id: 'BS-TUS-008', name: 'Tussar Ghicha - Black', quantity: 16, purchasePrice: 2300, salePrice: 4200, gstPercent: 5 },
    { id: 'BS-TUS-009', name: 'Tussar Silk - Temple Border', quantity: 9, purchasePrice: 3200, salePrice: 6000, gstPercent: 5 },
    { id: 'BS-TUS-010', name: 'Tussar Silk - Pink', quantity: 12, purchasePrice: 2700, salePrice: 5000, gstPercent: 5 },
    // Uppada Silk - 10
    { id: 'BS-UPP-001', name: 'Uppada Silk - Sea Green', quantity: 10, purchasePrice: 3500, salePrice: 6500, gstPercent: 5 },
    { id: 'BS-UPP-002', name: 'Uppada Pattu - Jamdani Weave', quantity: 8, purchasePrice: 4500, salePrice: 8500, gstPercent: 5 },
    { id: 'BS-UPP-003', name: 'Uppada Cotton - Light Blue', quantity: 18, purchasePrice: 1800, salePrice: 3200, gstPercent: 5 },
    { id: 'BS-UPP-004', name: 'Uppada Silk - Tissue Border', quantity: 12, purchasePrice: 3800, salePrice: 7000, gstPercent: 5 },
    { id: 'BS-UPP-005', name: 'Uppada Pattu - Silver Buttis', quantity: 9, purchasePrice: 4200, salePrice: 7800, gstPercent: 5 },
    { id: 'BS-UPP-006', name: 'Uppada Silk - Peach', quantity: 13, purchasePrice: 3600, salePrice: 6700, gstPercent: 5 },
    { id: 'BS-UPP-007', name: 'Uppada Pattu - All Over Weave', quantity: 7, purchasePrice: 4800, salePrice: 9000, gstPercent: 5 },
    { id: 'BS-UPP-008', name: 'Uppada Cotton - Yellow', quantity: 20, purchasePrice: 1900, salePrice: 3400, gstPercent: 5 },
    { id: 'BS-UPP-009', name: 'Uppada Silk - Lavender', quantity: 11, purchasePrice: 3700, salePrice: 6800, gstPercent: 5 },
    { id: 'BS-UPP-010', name: 'Uppada Pattu - Big Border', quantity: 8, purchasePrice: 4600, salePrice: 8700, gstPercent: 5 },
];

const purchases: Purchase[] = [
    { id: 'PUR-20240701-090000', supplierId: 'SUPP-002', items: [{ productId: 'BS-KAN-001', productName: 'Kanchi Pattu - Peacock Blue', quantity: 20, price: 4000, gstPercent: 5, saleValue: 6500 }], totalAmount: 80000, date: daysAgo(50), payments: [{ id: 'PAY-P-1', amount: 80000, date: daysAgo(50), method: 'UPI' }], paymentDueDates: [] },
    { id: 'PUR-20240705-140000', supplierId: 'SUPP-001', items: [{ productId: 'BS-COT-001', productName: 'Chettinad Cotton - Mustard', quantity: 30, price: 800, gstPercent: 5, saleValue: 1500 }], totalAmount: 24000, date: daysAgo(45), payments: [{ id: 'PAY-P-2', amount: 14000, date: daysAgo(45), method: 'CASH' }], paymentDueDates: [daysFromNow(15)] },
    { id: 'PUR-20240801-120000', supplierId: 'SUPP-006', items: [{ productId: 'BS-SILK-001', productName: 'Mysore Silk - Royal Green', quantity: 20, price: 2500, gstPercent: 5, saleValue: 4500 }], totalAmount: 50000, date: daysAgo(18), payments: [{ id: 'PAY-P-3', amount: 25000, date: daysAgo(18), method: 'CASH' }], paymentDueDates: [daysAgo(10), daysFromNow(25)] },
];

const sales: Sale[] = [
    { id: 'SALE-20240710-113000', customerId: 'CUST-001', items: [{ productId: 'BS-KAN-001', productName: 'Kanchi Pattu - Peacock Blue', quantity: 1, price: 6500 }], discount: 200, totalAmount: 6300, gstAmount: 309.52, date: daysAgo(40), payments: [{ id: 'PAY-S-1', amount: 6300, date: daysAgo(40), method: 'UPI' }] },
    { id: 'SALE-20240715-150000', customerId: 'CUST-002', items: [{ productId: 'BS-COT-001', productName: 'Chettinad Cotton - Mustard', quantity: 2, price: 1500 }], discount: 0, totalAmount: 3000, gstAmount: 142.86, date: daysAgo(35), payments: [{ id: 'PAY-S-2', amount: 1000, date: daysAgo(35), method: 'CASH' }] },
    { id: 'SALE-20240801-100000', customerId: 'CUST-003', items: [{ productId: 'BS-KAN-002', productName: 'Kanchi Pattu - Ruby Red', quantity: 1, price: 7000 }, { productId: 'BS-SILK-001', productName: 'Mysore Silk - Royal Green', quantity: 1, price: 4500 }], discount: 500, totalAmount: 11000, gstAmount: 523.81, date: daysAgo(15), payments: [{ id: 'PAY-S-3', amount: 11000, date: daysAgo(15), method: 'CHEQUE', reference: 'CHQ-54321' }] },
    { id: 'SALE-20240810-180000', customerId: 'CUST-001', items: [{ productId: 'BS-SYN-001', productName: 'Synthetic Georgette - Floral', quantity: 3, price: 950 }], discount: 50, totalAmount: 2800, gstAmount: 300, date: daysAgo(5), payments: [] },
    { id: 'SALE-20240811-120000', customerId: 'CUST-004', items: [{ productId: 'BS-SILK-002', productName: 'Mysore Silk - Classic Pink', quantity: 1, price: 4700 }], discount: 0, totalAmount: 4700, gstAmount: 223.81, date: daysAgo(4), payments: [{ id: 'PAY-S-4', amount: 4700, date: daysAgo(4), method: 'CASH' }] },
    { id: 'SALE-20240812-163000', customerId: 'CUST-005', items: [{ productId: 'BS-COT-003', productName: 'Chettinad Cotton - Maroon Checks', quantity: 3, price: 1700 }], discount: 100, totalAmount: 5000, gstAmount: 238.1, date: daysAgo(3), payments: [{ id: 'PAY-S-5', amount: 2000, date: daysAgo(3), method: 'UPI' }] },
    { id: 'SALE-20240813-110000', customerId: 'CUST-002', items: [{ productId: 'BS-BAN-001', productName: 'Banarasi Silk - Red Bridal', quantity: 1, price: 11000 }], discount: 1000, totalAmount: 10000, gstAmount: 476.19, date: daysAgo(2), payments: [] },
];

const returns: Return[] = [
    { id: 'RET-20240720-100000', type: 'CUSTOMER', referenceId: 'SALE-20240710-113000', partyId: 'CUST-001', items: [{ productId: 'BS-KAN-001', productName: 'Kanchi Pattu - Peacock Blue', quantity: 1, price: 6500 }], returnDate: daysAgo(30), amount: 6300, reason: 'Color mismatch' }
];

// This is a simplified static dataset. In a real generation script, you'd calculate final stock.
// For this static file, the quantities in the `products` array are pre-calculated for simplicity.
// (Total Purchases) - (Total Sales) + (Total Customer Returns)

export const testData: Omit<AppState, 'toast' | 'selection' | 'installPromptEvent' | 'notifications' | 'profile' | 'pin'> = {
  customers,
  suppliers,
  products,
  sales,
  purchases,
  returns,
  app_metadata: [],
  // FIX: Added missing 'theme' property to satisfy the type.
  theme: 'light',
};
