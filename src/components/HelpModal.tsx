import React, { useState } from 'react';
import { X, LayoutDashboard, Users, ShoppingCart, Package, Boxes, Undo2, FileText, Search, UserCircle, Bell, ChevronDown, HelpCircle } from 'lucide-react';
import Card from './Card';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const helpContent = {
  en: {
    title: 'Help & Documentation',
    sections: [
      {
        title: 'Dashboard',
        content: (
          <div className="space-y-2">
            <p>The dashboard provides a quick overview of your business metrics.</p>
            <ul className="list-disc list-inside pl-4 text-sm">
                <li><strong>Metrics:</strong> See total sales, purchases, outstanding dues from customers, dues to suppliers, total inventory value, and total items in stock.</li>
                <li><strong>Overdue Dues Alert:</strong> This card automatically shows customers with payments pending for more than 30 days. Tap a customer to view their details.</li>
            </ul>
            <h4 className="font-semibold mt-2">Data Backup & Restore</h4>
            <ol className="list-decimal list-inside pl-4 text-sm">
              <li>Regularly click <strong>"Backup Data Now"</strong> to download a file containing all your app data.</li>
              <li>Store this file in a safe place (like Google Drive, your computer, or a pen drive).</li>
              <li>To restore data on this or another device, click <strong>"Restore from Backup"</strong> and select your saved backup file.</li>
            </ol>
            <p className="font-bold text-red-600 mt-2">Important: All data is saved only on your device. Always backup your data to prevent loss!</p>
             <h4 className="font-semibold mt-2">Install App</h4>
            <p className="text-sm">If you see an <strong>'Install App on Device'</strong> button, you can add this app to your phone's home screen for easy, offline access, just like a native app.</p>
          </div>
        )
      },
      {
        title: 'Customers',
        content: (
          <div className="space-y-2 text-sm">
            <p>Add new customers, search your existing list, or tap on a customer to see their full profile.</p>
            <h4 className="font-semibold mt-2">Customer Detail View</h4>
            <p>Once you select a customer, you can:</p>
            <ul className="list-disc list-inside pl-4">
                <li><strong>Edit Details:</strong> Update their name, phone, address, etc.</li>
                <li><strong>View Sales & Returns History:</strong> See a complete list of all their purchases and returns. Tap an invoice to expand it and see full details.</li>
                <li><strong>Manage Invoices:</strong> For each invoice, you can:
                    <ul className="list-disc list-inside pl-6">
                        <li><strong>Add Payment:</strong> Settle dues for that specific invoice.</li>
                        <li><strong>Edit Sale:</strong> Opens the invoice in the Sales page for modification.</li>
                        <li><strong>Delete Sale:</strong> Deletes the invoice and automatically returns the items to your stock.</li>
                        <li><strong>Download Receipt:</strong> Generates a small, 80mm thermal printer-friendly PDF receipt.</li>
                    </ul>
                </li>
                <li><strong>Share Dues Summary:</strong> Generate and share a professional PDF summary of all outstanding dues for that customer.</li>
            </ul>
          </div>
        )
      },
      {
        title: 'Sales',
        content: (
          <div className="space-y-2 text-sm">
            <p>This is your main screen for making sales and managing payments.</p>
            <h4 className="font-semibold mt-2">Creating a New Sale:</h4>
            <ol className="list-decimal list-inside pl-4">
              <li>Select a customer from the dropdown. You can also add a new customer from here.</li>
              <li>Add products to the cart using <strong>"Select Product"</strong> or by scanning a QR code with <strong>"Scan Product"</strong>.</li>
              <li>Enter any discount and the amount the customer is paying now.</li>
              <li>Click <strong>"Create Sale & Share Invoice"</strong> to finish. This saves the sale, updates your stock, and opens your phone's share menu to send the 80mm PDF receipt.</li>
            </ol>
            <h4 className="font-semibold mt-2">Recording a Payment for Dues:</h4>
            <ol className="list-decimal list-inside pl-4">
              <li>Select the customer.</li>
              <li>Do NOT add any items to the cart.</li>
              <li>Enter the amount they are paying in the "Amount Paid" field that appears.</li>
              <li>Click <strong>"Record Standalone Payment"</strong>. The app will automatically apply the payment to their oldest unpaid invoices first.</li>
            </ol>
            <h4 className="font-semibold mt-2">Editing a Sale & History</h4>
             <p>You can edit any sale from the Customer's history or from the 'Last 10 Transactions' list at the bottom of this page. The form will be pre-filled with the sale's data. When you save your changes, stock levels will be adjusted automatically.</p>
          </div>
        )
      },
       {
        title: 'Purchases & Suppliers',
        content: (
          <div className="space-y-2 text-sm">
            <p>Manage your suppliers and record new stock purchases.</p>
            <h4 className="font-semibold mt-2">Managing Suppliers</h4>
            <p>Add new suppliers or tap on an existing one to view their details, edit their information, and see their full purchase and return history. Tap a purchase to expand it and see more details. You can edit or delete any purchase from this view.</p>
            <h4 className="font-semibold mt-2">Creating a New Purchase</h4>
            <ol className="list-decimal list-inside pl-4">
              <li>Click <strong>"Create New Purchase"</strong> to go to the purchase order form.</li>
              <li>Select the supplier and date.</li>
              <li><strong>Add Items:</strong> You can add a **New Product** to your inventory, **Select an Existing Product** to add more stock, or **Scan a QR Code**. You can also **Import from CSV** to add many new products at once from a file.</li>
              <li>Complete the form and click <strong>"Complete Purchase"</strong> to save the record and update your inventory.</li>
            </ol>
            <h4 className="font-semibold mt-2">Last 10 Purchases</h4>
            <p>On the 'New Purchase Order' screen, you can see your most recent purchases. Click 'Edit' on any of them to make changes.</p>
          </div>
        )
      },
       {
        title: 'Products',
        content: (
          <div className="space-y-2 text-sm">
             <p>View your entire product catalog and manage inventory. Stock is automatically updated from Sales, Purchases, and Returns.</p>
             <ol className="list-decimal list-inside pl-4">
                <li>Click on a product to see more details like its purchase price and sale price.</li>
                <li>You can <strong>edit its details</strong> (name, prices, GST%) directly from this view.</li>
                <li>Use <strong>'Stock Adjustment'</strong> only for manual corrections (e.g., after a physical stock count). This corrects the quantity but does not create a financial record.</li>
            </ol>
          </div>
        )
      },
      {
        title: 'Returns',
        content: (
          <div className="space-y-2 text-sm">
             <p>Process returns from customers or returns you make to a supplier.</p>
             <h4 className="font-semibold mt-2">Customer Return:</h4>
            <ol className="list-decimal list-inside pl-4">
              <li>Go to the "Customer Return" tab.</li>
              <li>Select the customer and the original sales invoice.</li>
              <li>Enter the quantity of the items being returned.</li>
              <li>Enter the refund amount. The stock will be automatically added back to your inventory, and a credit will be applied to the customer's account for that sale.</li>
            </ol>
             <h4 className="font-semibold mt-2">Return to Supplier:</h4>
            <ol className="list-decimal list-inside pl-4">
              <li>Go to the "Return to Supplier" tab.</li>
              <li>Select the supplier and the original purchase invoice.</li>
              <li>Enter the quantity of items being returned.</li>
              <li>Enter the credit note value. This will generate a <strong>Debit Note PDF</strong>.</li>
              <li>The stock will be automatically deducted from your inventory, and a credit will be applied to your account for that purchase.</li>
            </ol>
            <h4 className="font-semibold mt-2">Editing Returns</h4>
            <p>From the 'Recent Returns' list, you can click the **Edit** icon on any past return to correct quantities or amounts. Stock and financial records will be adjusted automatically.</p>
          </div>
        )
      },
      {
        title: 'Reports',
        content: (
          <div className="space-y-2 text-sm">
            <h4 className="font-semibold mt-2">Dues Report</h4>
            <p>Generate a list of all customers with outstanding dues. You can filter by customer area and a date range. Export the report as a PDF or CSV.</p>
            <h4 className="font-semibold mt-2">Overall Sales by Customer</h4>
            <p>See a summary of total sales, payments, and dues for each customer within the selected date range.</p>
            <h4 className="font-semibold mt-2">Import Sales from CSV</h4>
            <p>Use this tool to bulk-import historical sales data. This is useful for migrating from another system. The CSV must have specific columns: <strong>`saleid`, `date`, `customerid`, `productid`, `quantity`, `price`, `discount`</strong>. Customers and products must already exist in the app.</p>
          </div>
        )
      },
       {
        title: 'Universal Search',
        content: (
          <div className="space-y-2 text-sm">
             <p>The Search icon (magnifying glass) in the top header is a powerful tool. You can search for:</p>
            <ul className="list-disc list-inside pl-4">
                <li><strong>Customers</strong> (by name, phone, area, ID)</li>
                <li><strong>Suppliers</strong> (by name, phone, location, ID)</li>
                <li><strong>Products</strong> (by name, code/ID)</li>
                <li><strong>Sale Invoices</strong> (by ID)</li>
                <li><strong>Purchase Invoices</strong> (by internal ID or supplier invoice ID)</li>
            </ul>
             <p>Tap on a result to navigate directly to that item's page.</p>
          </div>
        )
      },
      {
        title: 'My Business Profile',
        content: (
          <div className="space-y-2 text-sm">
            <p>Set up your business details to be used on official documents.</p>
            <ol className="list-decimal list-inside pl-4">
                <li>Click the <strong>Menu</strong> icon (three horizontal lines) in the top-left corner.</li>
                <li>Select "My Business Profile".</li>
                <li>Fill in your business name, address, phone, and GST number.</li>
                <li>This information will automatically appear on documents like the <strong>Debit Note</strong> you generate when returning items to a supplier.</li>
            </ol>
          </div>
        )
      },
      {
        title: 'Notifications',
        content: (
          <div className="space-y-2 text-sm">
            <p>The app provides important reminders and alerts.</p>
            <ol className="list-decimal list-inside pl-4">
                <li>Click the <strong>Bell</strong> icon in the top-right corner to view your notifications.</li>
                <li>A red dot indicates you have unread notifications.</li>
                <li>You will receive alerts for things like daily backup reminders.</li>
            </ol>
          </div>
        )
      },
    ]
  },
  te: {
    title: 'సహాయం & డాక్యుమెంటేషన్',
    sections: [
      {
        title: 'డాష్‌బోర్డ్',
        content: (
          <div className="space-y-2">
            <p>డాష్‌బోర్డ్ మీ వ్యాపారం యొక్క ముఖ్య గణాంకాలను చూపుతుంది.</p>
            <ul className="list-disc list-inside pl-4 text-sm">
                <li><strong>గణాంకాలు:</strong> మొత్తం అమ్మకాలు, కొనుగోళ్లు, కస్టమర్ల బకాయిలు, సరఫరాదారుల బకాయిలు, ఇన్వెంటరీ విలువ, మరియు స్టాక్‌లోని వస్తువుల సంఖ్యను చూడండి.</li>
                <li><strong>మీరిన బకాయిలు:</strong> ఈ కార్డ్ 30 రోజుల కంటే ఎక్కువ కాలంగా చెల్లింపులు పెండింగ్‌లో ఉన్న కస్టమర్లను చూపుతుంది. వివరాలు చూడటానికి కస్టమర్‌పై నొక్కండి.</li>
            </ul>
            <h4 className="font-semibold mt-2">డేటా బ్యాకప్ & పునరుద్ధరణ</h4>
            <ol className="list-decimal list-inside pl-4 text-sm">
              <li>మీ యాప్ డేటా మొత్తాన్ని ఒక ఫైల్‌లో డౌన్‌లోడ్ చేయడానికి <strong>"Backup Data Now"</strong> పై క్రమం తప్పకుండా క్లిక్ చేయండి.</li>
              <li>ఈ ఫైల్‌ను సురక్షితమైన స్థలంలో (Google Drive, మీ కంప్యూటర్, లేదా పెన్ డ్రైవ్ వంటివి) నిల్వ చేయండి.</li>
              <li>ఈ లేదా మరొక పరికరంలో డేటాను పునరుద్ధరించడానికి, <strong>"Restore from Backup"</strong> పై క్లిక్ చేసి, మీరు సేవ్ చేసిన బ్యాకప్ ఫైల్‌ను ఎంచుకోండి.</li>
            </ol>
            <p className="font-bold text-red-600 mt-2">ముఖ్యమైనది: మొత్తం డేటా మీ పరికరంలో మాత్రమే సేవ్ చేయబడుతుంది. నష్టాన్ని నివారించడానికి మీ డేటాను ఎల్లప్పుడూ బ్యాకప్ చేయండి!</p>
            <h4 className="font-semibold mt-2">యాప్ ఇన్‌స్టాల్</h4>
            <p className="text-sm">మీరు <strong>'Install App on Device'</strong> బటన్‌ను చూస్తే, మీరు ఈ యాప్‌ను మీ ఫోన్ హోమ్ స్క్రీన్‌కు సులభమైన, ఆఫ్‌లైన్ యాక్సెస్ కోసం జోడించవచ్చు.</p>
          </div>
        )
      },
      {
        title: 'కస్టమర్లు',
        content: (
          <div className="space-y-2 text-sm">
            <p>కొత్త కస్టమర్లను జోడించండి, మీ ప్రస్తుత జాబితాను శోధించండి, లేదా వారి పూర్తి ప్రొఫైల్‌ను చూడటానికి ఒక కస్టమర్‌పై నొక్కండి.</p>
            <h4 className="font-semibold mt-2">కస్టమర్ వివరాల వీక్షణ</h4>
            <p>ఒకసారి మీరు ఒక కస్టమర్‌ను ఎంచుకుంటే, మీరు ఇవి చేయవచ్చు:</p>
            <ul className="list-disc list-inside pl-4">
                <li><strong>వివరాలను సవరించండి:</strong> వారి పేరు, ఫోన్, చిరునామా మొదలైనవి నవీకరించండి.</li>
                <li><strong>అమ్మకాలు & వాపసుల చరిత్ర:</strong> వారి కొనుగోళ్లు మరియు వాపసుల పూర్తి జాబితాను చూడండి. పూర్తి వివరాలు చూడటానికి ఇన్‌వాయిస్‌పై నొక్కండి.</li>
                <li><strong>ఇన్‌వాయిస్‌లను నిర్వహించండి:</strong> ప్రతి ఇన్‌వాయిస్ కోసం, మీరు:
                    <ul className="list-disc list-inside pl-6">
                        <li><strong>చెల్లింపును జోడించండి:</strong> ఆ ఇన్‌వాయిస్ కోసం బకాయిలను చెల్లించండి.</li>
                        <li><strong>అమ్మకాన్ని సవరించండి:</strong> మార్పుల కోసం ఇన్‌వాయిస్‌ను సేల్స్ పేజీలో తెరుస్తుంది.</li>
                        <li><strong>అమ్మకాన్ని తొలగించండి:</strong> ఇన్‌వాయిస్‌ను తొలగిస్తుంది మరియు వస్తువులను స్వయంచాలకంగా మీ స్టాక్‌కు తిరిగి చేరుస్తుంది.</li>
                        <li><strong>రసీదును డౌన్‌లోడ్ చేయండి:</strong> ఒక చిన్న, 80mm థర్మల్ ప్రింటర్-స్నేహపూర్వక PDF రసీదును రూపొందిస్తుంది.</li>
                    </ul>
                </li>
                <li><strong>బకాయిల సారాంశాన్ని షేర్ చేయండి:</strong> ఆ కస్టమర్ యొక్క అన్ని బకాయిల యొక్క ప్రొఫెషనల్ PDF సారాంశాన్ని రూపొందించి షేర్ చేయండి.</li>
            </ul>
          </div>
        )
      },
      {
        title: 'అమ్మకాలు (Sales)',
        content: (
          <div className="space-y-2 text-sm">
            <p>అమ్మకాలు చేయడానికి మరియు చెల్లింపులను నిర్వహించడానికి ఇది మీ ప్రధాన స్క్రీన్.</p>
            <h4 className="font-semibold mt-2">కొత్త అమ్మకాన్ని సృష్టించడం:</h4>
            <ol className="list-decimal list-inside pl-4">
              <li>ఒక కస్టమర్‌ను ఎంచుకోండి. మీరు ఇక్కడ నుండి కొత్త కస్టమర్‌ను కూడా జోడించవచ్చు.</li>
              <li><strong>"Select Product"</strong> ఉపయోగించి లేదా <strong>"Scan Product"</strong> తో QR కోడ్‌ను స్కాన్ చేయడం ద్వారా కార్ట్‌కు ఉత్పత్తులను జోడించండి.</li>
              <li>ఏదైనా తగ్గింపు మరియు కస్టమర్ ఇప్పుడు చెల్లిస్తున్న మొత్తాన్ని నమోదు చేయండి.</li>
              <li>పూర్తి చేయడానికి <strong>"Create Sale & Share Invoice"</strong> పై క్లిక్ చేయండి. ఇది అమ్మకాన్ని సేవ్ చేస్తుంది, మీ స్టాక్‌ను నవీకరిస్తుంది, మరియు 80mm PDF రసీదును పంపడానికి మీ ఫోన్ యొక్క షేర్ మెనూను తెరుస్తుంది.</li>
            </ol>
            <h4 className="font-semibold mt-2">బకాయిల కోసం చెల్లింపును రికార్డ్ చేయడం:</h4>
            <ol className="list-decimal list-inside pl-4">
              <li>కస్టమర్‌ను ఎంచుకోండి.</li>
              <li>కార్ట్‌కు ఏ వస్తువులనూ జోడించవద్దు.</li>
              <li>వారు చెల్లిస్తున్న మొత్తాన్ని కనిపించే "Amount Paid" ఫీల్డ్‌లో నమోదు చేయండి.</li>
              <li><strong>"Record Standalone Payment"</strong> పై క్లిక్ చేయండి. యాప్ స్వయంచాలకంగా చెల్లింపును వారి పాత చెల్లించని ఇన్‌వాయిస్‌లకు ముందుగా వర్తింపజేస్తుంది.</li>
            </ol>
            <h4 className="font-semibold mt-2">అమ్మకాన్ని సవరించడం & చరిత్ర</h4>
            <p>మీరు కస్టమర్ చరిత్ర నుండి లేదా ఈ పేజీ దిగువన ఉన్న 'Last 10 Transactions' జాబితా నుండి ఏ అమ్మకాన్నైనా సవరించవచ్చు. ఫారమ్ అమ్మకం యొక్క డేటాతో ముందుగానే నింపబడుతుంది. మీరు మీ మార్పులను సేవ్ చేసినప్పుడు, స్టాక్ స్థాయిలు స్వయంచాలకంగా సర్దుబాటు చేయబడతాయి.</p>
          </div>
        )
      },
       {
        title: 'కొనుగోళ్లు (Purchases) & సరఫరాదారులు',
        content: (
          <div className="space-y-2 text-sm">
            <p>మీ సరఫరాదారులను నిర్వహించండి మరియు కొత్త స్టాక్ కొనుగోళ్లను రికార్డ్ చేయండి.</p>
            <h4 className="font-semibold mt-2">సరఫరాదారులను నిర్వహించడం</h4>
            <p>కొత్త సరఫరాదారులను జోడించండి లేదా వారి వివరాలు, వారి పూర్తి కొనుగోలు మరియు వాపసు చరిత్రను చూడటానికి ఉన్నవారిపై నొక్కండి. మీరు ఈ వీక్షణ నుండి ఏ కొనుగోలునైనా సవరించవచ్చు లేదా తొలగించవచ్చు.</p>
            <h4 className="font-semibold mt-2">కొత్త కొనుగోలును సృష్టించడం</h4>
            <ol className="list-decimal list-inside pl-4">
              <li>కొనుగోలు ఆర్డర్ ఫారమ్‌కు వెళ్లడానికి <strong>"Create New Purchase"</strong> పై క్లిక్ చేయండి.</li>
              <li>సరఫరాదారుని మరియు తేదీని ఎంచుకోండి.</li>
              <li><strong>వస్తువులను జోడించండి:</strong> మీరు ఒక <strong>కొత్త ఉత్పత్తిని</strong> మీ ఇన్వెంటరీకి జోడించవచ్చు, ఎక్కువ స్టాక్ కోసం <strong>ఉన్న ఉత్పత్తిని ఎంచుకోవచ్చు</strong>, లేదా <strong>QR కోడ్‌ను స్కాన్ చేయవచ్చు</strong>. మీరు ఒక ఫైల్ నుండి ఒకేసారి అనేక కొత్త ఉత్పత్తులను జోడించడానికి <strong>CSV నుండి దిగుమతి</strong> కూడా చేయవచ్చు.</li>
              <li>ఫారమ్‌ను పూర్తి చేసి, రికార్డును సేవ్ చేయడానికి మరియు మీ ఇన్వెంటరీని నవీకరించడానికి <strong>"Complete Purchase"</strong> పై క్లిక్ చేయండి.</li>
            </ol>
            <h4 className="font-semibold mt-2">చివరి 10 కొనుగోళ్లు</h4>
            <p>'New Purchase Order' స్క్రీన్‌పై, మీరు మీ ఇటీవలి కొనుగోళ్లను చూడవచ్చు. మార్పులు చేయడానికి వాటిలో దేనిపైనైనా 'Edit' క్లిక్ చేయండి.</p>
          </div>
        )
      },
       {
        title: 'ఉత్పత్తులు (Products)',
        content: (
          <div className="space-y-2 text-sm">
             <p>మీ పూర్తి ఉత్పత్తి కేటలాగ్‌ను వీక్షించండి మరియు ఇన్వెంటరీని నిర్వహించండి. అమ్మకాలు, కొనుగోళ్లు, మరియు వాపసుల నుండి స్టాక్ స్వయంచాలకంగా నవీకరించబడుతుంది.</p>
             <ol className="list-decimal list-inside pl-4">
                <li>ఒక ఉత్పత్తిపై దాని కొనుగోలు ధర మరియు అమ్మకపు ధర వంటి మరిన్ని వివరాలను చూడటానికి క్లిక్ చేయండి.</li>
                <li>మీరు దాని వివరాలను (పేరు, ధరలు, GST%) నేరుగా ఈ వీక్షణ నుండి <strong>సవరించవచ్చు</strong>.</li>
                <li>మాన్యువల్ సవరణల కోసం మాత్రమే <strong>'Stock Adjustment'</strong> ఉపయోగించండి (ఉదా. భౌతిక స్టాక్ లెక్కింపు తర్వాత). ఇది పరిమాణాన్ని సరిచేస్తుంది కానీ ఆర్థిక రికార్డును సృష్టించదు.</li>
            </ol>
          </div>
        )
      },
      {
        title: 'వాపసులు (Returns)',
        content: (
          <div className="space-y-2 text-sm">
             <p>కస్టమర్ల నుండి వాపసులను లేదా మీరు సరఫరాదారునికి చేసే వాపసులను ప్రాసెస్ చేయండి.</p>
             <h4 className="font-semibold mt-2">కస్టమర్ వాపసు:</h4>
            <ol className="list-decimal list-inside pl-4">
              <li>"Customer Return" ట్యాబ్‌కు వెళ్లండి.</li>
              <li>కస్టమర్‌ను మరియు అసలు అమ్మకాల ఇన్‌వాయిస్‌ను ఎంచుకోండి.</li>
              <li>వాపసు చేయబడుతున్న వస్తువుల పరిమాణాన్ని నమోదు చేయండి.</li>
              <li>తిరిగి చెల్లించే మొత్తాన్ని నమోదు చేయండి. స్టాక్ స్వయంచాలకంగా మీ ఇన్వెంటరీకి తిరిగి జోడించబడుతుంది, మరియు ఆ అమ్మకం కోసం కస్టమర్ ఖాతాకు క్రెడిట్ వర్తింపజేయబడుతుంది.</li>
            </ol>
             <h4 className="font-semibold mt-2">సరఫరాదారునికి వాపసు:</h4>
            <ol className="list-decimal list-inside pl-4">
              <li>"Return to Supplier" ట్యాబ్‌కు వెళ్లండి.</li>
              <li>సరఫరాదారుని మరియు అసలు కొనుగోలు ఇన్‌వాయిస్‌ను ఎంచుకోండి.</li>
              <li>వాపసు చేయబడుతున్న వస్తువుల పరిమాణాన్ని నమోదు చేయండి.</li>
              <li>క్రెడిట్ నోట్ విలువను నమోదు చేయండి. ఇది ఒక <strong>డెబిట్ నోట్ PDF</strong>ని రూపొందిస్తుంది.</li>
              <li>స్టాక్ స్వయంచాలకంగా మీ ఇన్వెంటరీ నుండి తీసివేయబడుతుంది, మరియు ఆ కొనుగోలు కోసం మీ ఖాతాకు క్రెడిట్ వర్తింపజేయబడుతుంది.</li>
            </ol>
            <h4 className="font-semibold mt-2">వాపసులను సవరించడం</h4>
            <p>'Recent Returns' జాబితా నుండి, పరిమాణాలు లేదా మొత్తాలను సరిచేయడానికి మీరు ఏ పాత వాపసుపైనైనా **Edit** ఐకాన్‌పై క్లిక్ చేయవచ్చు. స్టాక్ మరియు ఆర్థిక రికార్డులు స్వయంచాలకంగా సర్దుబాటు చేయబడతాయి.</p>
          </div>
        )
      },
      {
        title: 'నివేదికలు (Reports)',
        content: (
          <div className="space-y-2 text-sm">
             <h4 className="font-semibold mt-2">బకాయిల నివేదిక</h4>
             <p>బకాయిలు ఉన్న కస్టమర్లందరి జాబితాను రూపొందించండి. మీరు కస్టమర్ ప్రాంతం మరియు తేదీ పరిధి ద్వారా ఫిల్టర్ చేయవచ్చు. నివేదికను PDF లేదా CSV గా ఎగుమతి చేయండి.</p>
             <h4 className="font-semibold mt-2">కస్టమర్ వారీగా మొత్తం అమ్మకాలు</h4>
             <p>ఎంచుకున్న తేదీ పరిధిలో ప్రతి కస్టమర్ కోసం మొత్తం అమ్మకాలు, చెల్లింపులు, మరియు బకాయిల సారాంశాన్ని చూడండి.</p>
             <h4 className="font-semibold mt-2">CSV నుండి అమ్మకాలను దిగుమతి చేయండి</h4>
             <p>చారిత్రక అమ్మకాల డేటాను పెద్దమొత్తంలో దిగుమతి చేయడానికి ఈ సాధనాన్ని ఉపయోగించండి. CSV లో నిర్దిష్ట నిలువు వరుసలు ఉండాలి: <strong>`saleid`, `date`, `customerid`, `productid`, `quantity`, `price`, `discount`</strong>. కస్టమర్లు మరియు ఉత్పత్తులు యాప్‌లో ముందే ఉండాలి.</p>
          </div>
        )
      },
       {
        title: 'యూనివర్సల్ సెర్చ్',
        content: (
          <div className="space-y-2 text-sm">
             <p>ఎగువ హెడర్‌లోని సెర్చ్ ఐకాన్ (భూతద్దం) ఒక శక్తివంతమైన సాధనం. మీరు వీటి కోసం శోధించవచ్చు:</p>
             <ul className="list-disc list-inside pl-4">
                <li><strong>కస్టమర్లు</strong> (పేరు, ఫోన్, ప్రాంతం, ID ద్వారా)</li>
                <li><strong>సరఫరాదారులు</strong> (పేరు, ఫోన్, స్థానం, ID ద్వారా)</li>
                <li><strong>ఉత్పత్తులు</strong> (పేరు, కోడ్/ID ద్వారా)</li>
                <li><strong>సేల్ ఇన్‌వాయిస్‌లు</strong> (ID ద్వారా)</li>
                <li><strong>కొనుగోలు ఇన్‌వాయిస్‌లు</strong> (అంతర్గత ID లేదా సరఫరాదారు ఇన్‌వాయిస్ ID ద్వారా)</li>
            </ul>
             <p>ఆ అంశం యొక్క పేజీకి నేరుగా నావిగేట్ చేయడానికి ఫలితంపై నొక్కండి.</p>
          </div>
        )
      },
      {
        title: 'నా వ్యాపార ప్రొఫైల్',
        content: (
          <div className="space-y-2 text-sm">
            <p>అధికారిక పత్రాలలో ఉపయోగించడానికి మీ వ్యాపార వివరాలను సెటప్ చేయండి.</p>
            <ol className="list-decimal list-inside pl-4">
                <li>ఎగువ-ఎడమ మూలలో ఉన్న <strong>మెనూ</strong> ఐకాన్ (మూడు అడ్డ గీతలు) పై క్లిక్ చేయండి.</li>
                <li>"My Business Profile" ఎంచుకోండి.</li>
                <li>మీ వ్యాపారం పేరు, చిరునామా, ఫోన్ మరియు GST నంబర్‌ను పూరించండి.</li>
                <li>ఈ సమాచారం మీరు సరఫరాదారునికి వస్తువులను వాపసు చేసేటప్పుడు రూపొందించే <strong>డెబిట్ నోట్</strong> వంటి పత్రాలపై స్వయంచాలకంగా కనిపిస్తుంది.</li>
            </ol>
          </div>
        )
      },
      {
        title: 'నోటిఫికేషన్‌లు',
        content: (
          <div className="space-y-2 text-sm">
            <p>యాప్ ముఖ్యమైన రిమైండర్‌లు మరియు హెచ్చరికలను అందిస్తుంది.</p>
            <ol className="list-decimal list-inside pl-4">
                <li>మీ నోటిఫికేషన్‌లను వీక్షించడానికి ఎగువ-కుడి మూలలో ఉన్న <strong>గంట</strong> ఐకాన్‌పై క్లిక్ చేయండి.</li>
                <li>ఎరుపు చుక్క మీకు చదవని నోటిఫికేషన్‌లు ఉన్నాయని సూచిస్తుంది.</li>
                <li>మీరు రోజువారీ బ్యాకప్ రిమైండర్‌ల వంటి వాటి కోసం హెచ్చరికలను అందుకుంటారు.</li>
            </ol>
          </div>
        )
      },
    ]
  }
};

const iconMap: { [key: string]: React.ElementType } = {
    'Dashboard': LayoutDashboard,
    'Customers': Users,
    'Sales': ShoppingCart,
    'Purchases & Suppliers': Package,
    'Products': Boxes,
    'Returns': Undo2,
    'Reports': FileText,
    'Universal Search': Search,
    'My Business Profile': UserCircle,
    'Notifications': Bell,
    'డాష్‌బోర్డ్': LayoutDashboard,
    'కస్టమర్లు': Users,
    'అమ్మకాలు (Sales)': ShoppingCart,
    'కొనుగోళ్లు (Purchases) & సరఫరాదారులు': Package,
    'ఉత్పత్తులు (Products)': Boxes,
    'వాపసులు (Returns)': Undo2,
    'నివేదికలు (Reports)': FileText,
    'యూనివర్సల్ సెర్చ్': Search,
    'నా వ్యాపార ప్రొఫైల్': UserCircle,
    'నోటిఫికేషన్‌లు': Bell,
};

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  icon: React.ElementType;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, isOpen, onToggle, icon: Icon }) => {
  return (
    <Card className="!p-0 !shadow-sm hover:!shadow-lg transition-shadow duration-300 overflow-hidden !border-t-0 !border-l-4 !border-purple-300 hover:!border-primary">
      <button
        className="w-full flex justify-between items-center p-4 text-left"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-4">
          <Icon className="w-6 h-6 text-primary flex-shrink-0" />
          <h3 className="font-bold text-md md:text-lg text-primary">{title}</h3>
        </div>
        <ChevronDown
          className={`w-6 h-6 text-primary transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.4s ease-in-out'
        }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-2 border-t border-purple-100">
            {children}
          </div>
        </div>
      </div>
    </Card>
  );
};


const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [language, setLanguage] = useState<'en' | 'te'>('en');
  const [openSection, setOpenSection] = useState<number | null>(0);

  if (!isOpen) return null;

  const content = helpContent[language];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[101] p-4 animate-fade-in-fast" 
      aria-modal="true" 
      role="dialog"
      onClick={onClose}
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <Card className="w-full flex-shrink-0 animate-scale-in">
           <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-primary">{content.title}</h2>
              <div className="mt-2">
                <button 
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 text-sm rounded-l-md ${language === 'en' ? 'bg-primary text-white' : 'bg-gray-200'}`}
                >
                  English
                </button>
                <button 
                  onClick={() => setLanguage('te')}
                  className={`px-3 py-1 text-sm rounded-r-md ${language === 'te' ? 'bg-primary text-white' : 'bg-gray-200'}`}
                >
                  తెలుగు
                </button>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
              <X size={24} />
            </button>
          </div>
        </Card>
        <div className="overflow-y-auto mt-2 pr-1">
            <div className="space-y-3">
              {content.sections.map((section, index) => (
                <AccordionItem
                    key={index}
                    title={section.title}
                    isOpen={openSection === index}
                    onToggle={() => setOpenSection(openSection === index ? null : index)}
                    icon={iconMap[section.title] || HelpCircle}
                >
                  {section.content}
                </AccordionItem>
              ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;