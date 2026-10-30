import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { QRCodeSVG } from 'qrcode.react';

const AdminDashboard = () => {
  const [commissions, setCommissions] = useState(null);
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dealerPayments, setDealerPayments] = useState([]);
  const [dealers, setDealersList] = useState([]);
  const [leads, setLeads] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [filterRef, setFilterRef] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDealer, setFilterDealer] = useState('');
  const [showQR, setShowQR] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      const [commRes, salesRes, paymentsRes, dealerPaymentsRes, dealersRes, leadsRes, vehiclesRes] = await Promise.all([
        api.get('/commissions/summary'),
        api.get('/sales'),
        api.get('/commissions/payments'),
        api.get('/payments/all').catch(() => ({ data: [] })),
        api.get('/auth/dealers').catch(() => ({ data: [] })),
        api.get('/leads'),
        api.get('/vehicles/all').catch(() => api.get('/vehicles'))
      ]);
      setCommissions(commRes.data);
      setSales(salesRes.data);
      setPayments(paymentsRes.data);
      setDealerPayments(dealerPaymentsRes.data);
      setDealersList(dealersRes.data);
      setLeads(leadsRes.data);
      setVehicles(vehiclesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const verifyDealer = async (dealerId) => {
    if (!confirm('Verify this dealer and activate 2-month free trial? Only do this if documents match a legitimate profile.')) return;
    try {
      await api.post(`/auth/dealers/${dealerId}/verify`);
      alert('Dealer verified');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Error verifying dealer');
    }
  };

  const rejectDealer = async (dealerId) => {
    const reason = prompt('Reason for rejection (required):');
    if (!reason) return;
    try {
      await api.post(`/auth/dealers/${dealerId}/reject`, { reason });
      alert('Dealer rejected');
      fetchData();
    } catch (error) {
      alert('Error rejecting dealer');
    }
  };

  const approveDealerPayment = async (paymentId) => {
    const notes = prompt('Add approval notes (optional):');
    try {
      await api.post(`/payments/${paymentId}/approve`, { notes });
      alert('Payment approved. Dealer activated.');
      fetchData();
    } catch (error) {
      console.error('Error approving payment:', error);
      alert('Error approving payment');
    }
  };

  const rejectDealerPayment = async (paymentId) => {
    const notes = prompt('Reason for rejection (required):');
    if (!notes) return;
    try {
      await api.post(`/payments/${paymentId}/reject`, { notes });
      alert('Payment rejected.');
      fetchData();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Error rejecting payment');
    }
  };
  
  const confirmSale = async (saleId) => {
    try {
      await api.post(`/sales/${saleId}/confirm`);
      fetchData();
    } catch (error) {
      console.error('Error confirming sale:', error);
    }
  };
  
  const recordPayment = async (saleId) => {
    const amount = prompt('Enter payment amount:');
    const ref = prompt('Enter payment reference:');
    if (!amount) return;
    try {
      await api.post('/commissions/payments', { saleId, amount, paymentReference: ref });
      fetchData();
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };
  
  const commissionByRef = () => {
    const map = {};
    sales.forEach(sale => {
      const ref = sale.refCode || sale.lead?.referralCode || 'none';
      if (!map[ref]) map[ref] = { ref, count: 0, totalCommission: 0, totalSales: 0 };
      map[ref].count += 1;
      map[ref].totalCommission += sale.commissionAmount || 0;
      map[ref].totalSales += sale.salePrice || 0;
    });
    return Object.values(map).sort((a,b) => b.totalCommission - a.totalCommission);
  };
  
  const exportCSV = () => {
    const rows = [['Sale ID', 'Vehicle', 'Dealer', 'Ref', 'Sale Price', 'Commission Rate', 'Commission', 'Status', 'Sold At']];
    sales.forEach(sale => {
      rows.push([
        sale.id,
        `${sale.vehicle?.year || ''} ${sale.vehicle?.make} ${sale.vehicle?.model}`,
        sale.lead?.dealer?.name || '',
        sale.refCode || sale.lead?.referralCode || '',
        sale.salePrice,
        sale.commissionRate,
        sale.commissionAmount,
        sale.status,
        sale.soldAt
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zimcars-sales-${Date.now()}.csv`;
    a.click();
  };
  
  const dealerNames = [...new Set(sales.map(s => s.lead?.dealer?.name).filter(Boolean))];
  
  const filteredSales = sales.filter(s => {
    if (filterRef && !(s.refCode || s.lead?.referralCode || '').toLowerCase().includes(filterRef.toLowerCase())) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    if (filterDealer && s.lead?.dealer?.name !== filterDealer) return false;
    return true;
  });
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded min-h-[44px] ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Overview</button>
        <button onClick={() => setActiveTab('dealers')} className={`px-4 py-2 rounded min-h-[44px] ${activeTab === 'dealers' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Dealers ({dealersList.filter(d => d.verificationStatus !== 'verified').length})</button>
        <button onClick={() => setActiveTab('dealerPayments')} className={`px-4 py-2 rounded min-h-[44px] ${activeTab === 'dealerPayments' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Dealer Payments ({dealerPayments.filter(p => p.status === 'pending').length})</button>
        <button onClick={() => setActiveTab('sales')} className={`px-4 py-2 rounded min-h-[44px] ${activeTab === 'sales' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Sales & Referrals</button>
        <button onClick={() => setActiveTab('commissions')} className={`px-4 py-2 rounded min-h-[44px] ${activeTab === 'commissions' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Commission by Ref</button>
        <button onClick={() => setActiveTab('qr')} className={`px-4 py-2 rounded min-h-[44px] ${activeTab === 'qr' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>QR Codes</button>
      </div>
      
      {activeTab === 'overview' && commissions && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-gray-500 text-sm">Commission Earned</h3>
            <p className="text-2xl font-bold">${commissions.totalCommissionEarned.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-gray-500 text-sm">Commission Paid</h3>
            <p className="text-2xl font-bold text-green-600">${commissions.totalPaid.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-gray-500 text-sm">Commission Outstanding</h3>
            <p className="text-2xl font-bold text-red-600">${commissions.totalOutstanding.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-gray-500 text-sm">Sales Count</h3>
            <p className="text-2xl font-bold">{commissions.salesCount}</p>
          </div>
        </div>
      )}
      
      {activeTab === 'dealers' && (
        <>
          <h2 className="text-xl font-bold mb-2">Dealer Verification</h2>
          <p className="text-sm text-gray-600 mb-4">
            Only approve dealers with a legitimate verification profile. Match owner name to ID, check EcoCash name/sender, and verify documents before approving.
          </p>
          <div className="bg-white rounded shadow overflow-hidden">
            {dealersList.length === 0 ? (
              <div className="text-center py-12 text-gray-600">No dealers found.</div>
            ) : (
              <div className="divide-y">
                {dealersList.map((dealer) => (
                  <div key={dealer.id} className="p-4">
                    <div className="flex flex-wrap justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold">{dealer.name}</h3>
                        <p className="text-sm text-gray-600">{dealer.ownerFullName || dealer.users?.[0]?.name} • {dealer.phone} • {dealer.businessEmail || dealer.users?.[0]?.email}</p>
                        <p className="text-sm text-gray-600">ID: {dealer.idNumber || '-'} • EcoCash: {dealer.ecoCashName || '-'} • Location: {dealer.location || '-'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${dealer.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' : dealer.verificationStatus === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{dealer.verificationStatus}</span>
                        <span className={`px-2 py-1 rounded text-xs ${dealer.status === 'trial' ? 'bg-blue-100 text-blue-800' : dealer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{dealer.status}</span>
                      </div>
                    </div>
                    {dealer.rejectionReason && <p className="text-sm text-red-600 mb-2">Rejected: {dealer.rejectionReason}</p>}
                    <div className="mb-3">
                      <p className="text-sm font-semibold mb-1">Documents</p>
                      {dealer.verifications?.length === 0 ? <p className="text-sm text-gray-500">No documents uploaded.</p> : (
                        <div className="flex flex-wrap gap-2">
                          {dealer.verifications?.map((doc) => (
                            <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" className="px-3 py-2 bg-gray-100 rounded text-sm hover:bg-gray-200">
                              {doc.type.replace('_', ' ')} ({doc.status})
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    {dealer.verificationStatus !== 'verified' && dealer.verificationStatus !== 'rejected' && (
                      <div className="flex gap-2">
                        <button onClick={() => verifyDealer(dealer.id)} className="bg-green-600 text-white px-3 py-2 rounded text-sm min-h-[44px]">Approve & Activate Trial</button>
                        <button onClick={() => rejectDealer(dealer.id)} className="bg-red-600 text-white px-3 py-2 rounded text-sm min-h-[44px]">Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'dealerPayments' && (
        <>
          <h2 className="text-xl font-bold mb-2">Dealer Subscription & Joining Payments</h2>
          <p className="text-sm text-gray-600 mb-4">
            Verify each payment against your EcoCash statement before approving. Approving activates the dealer and
            sets a 1-month subscription. Reject only when the proof does not match a real transaction.
          </p>
          <div className="bg-white rounded shadow overflow-hidden">
            {dealerPayments.length === 0 ? (
              <div className="text-center py-12 text-gray-600">No dealer payments submitted yet.</div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Dealer</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-left">Amount</th>
                        <th className="px-4 py-2 text-left">Method</th>
                        <th className="px-4 py-2 text-left">Reference</th>
                        <th className="px-4 py-2 text-left">Proof</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dealerPayments.map((payment) => (
                        <tr key={payment.id} className="border-t">
                          <td className="px-4 py-2">
                            <div className="font-semibold">{payment.dealer?.name}</div>
                            <div className="text-xs text-gray-500">{payment.dealer?.phone || payment.dealer?.slug}</div>
                          </td>
                          <td className="px-4 py-2 capitalize">{payment.type}</td>
                          <td className="px-4 py-2">${payment.amount} {payment.currency}</td>
                          <td className="px-4 py-2 capitalize">{payment.method}</td>
                          <td className="px-4 py-2 text-sm font-mono">{payment.reference || '-'}</td>
                          <td className="px-4 py-2">
                            {payment.proofUrl ? (
                              <a href={payment.proofUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm">View proof</a>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              payment.status === 'approved' ? 'bg-green-100 text-green-800' :
                              payment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>{payment.status}</span>
                          </td>
                          <td className="px-4 py-2">
                            {payment.status === 'pending' ? (
                              <div className="flex gap-2">
                                <button onClick={() => approveDealerPayment(payment.id)} className="bg-green-600 text-white px-3 py-2 rounded text-sm min-h-[44px]">Approve</button>
                                <button onClick={() => rejectDealerPayment(payment.id)} className="bg-red-600 text-white px-3 py-2 rounded text-sm min-h-[44px]">Reject</button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">{payment.notes || '-'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden divide-y">
                  {dealerPayments.map((payment) => (
                    <div key={payment.id} className="p-4">
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold">{payment.dealer?.name}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          payment.status === 'approved' ? 'bg-green-100 text-green-800' :
                          payment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>{payment.status}</span>
                      </div>
                      <p className="text-sm capitalize">{payment.type} • ${payment.amount} • {payment.method}</p>
                      <p className="text-sm text-gray-600 font-mono">{payment.reference || 'No reference'}</p>
                      {payment.proofUrl && (
                        <a href={payment.proofUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm">View proof</a>
                      )}
                      {payment.status === 'pending' && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => approveDealerPayment(payment.id)} className="bg-green-600 text-white px-3 py-2 rounded text-sm min-h-[44px]">Approve</button>
                          <button onClick={() => rejectDealerPayment(payment.id)} className="bg-red-600 text-white px-3 py-2 rounded text-sm min-h-[44px]">Reject</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {activeTab === 'sales' && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <input value={filterRef} onChange={(e) => setFilterRef(e.target.value)} placeholder="Filter by ref code" className="px-3 py-2 border rounded min-h-[44px]" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded min-h-[44px]">
              <option value="">All Status</option>
              <option value="pending">pending</option>
              <option value="confirmed">confirmed</option>
              <option value="completed">completed</option>
            </select>
            <select value={filterDealer} onChange={(e) => setFilterDealer(e.target.value)} className="px-3 py-2 border rounded min-h-[44px]">
              <option value="">All Dealers</option>
              {dealerNames.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button onClick={exportCSV} className="bg-green-600 text-white px-4 py-2 rounded min-h-[44px]">Export CSV</button>
          </div>
          <h2 className="text-xl font-bold mb-4">All Sales</h2>
          <div className="bg-white rounded shadow overflow-hidden mb-8">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Vehicle</th>
                    <th className="px-4 py-2 text-left">Dealer</th>
                    <th className="px-4 py-2 text-left">Ref</th>
                    <th className="px-4 py-2 text-left">Sale Price</th>
                    <th className="px-4 py-2 text-left">Commission</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Sold At</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="border-t">
                      <td className="px-4 py-2">
                        {sale.vehicle?.year} {sale.vehicle?.make} {sale.vehicle?.model}
                      </td>
                      <td className="px-4 py-2">{sale.lead?.dealer?.name || '-'}</td>
                      <td className="px-4 py-2 text-sm">{sale.refCode || sale.lead?.referralCode || '-'}</td>
                      <td className="px-4 py-2">${sale.salePrice?.toLocaleString()}</td>
                      <td className="px-4 py-2">${sale.commissionAmount?.toFixed(2)} ({sale.commissionRate}%)</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          sale.status === 'confirmed' || sale.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">{sale.soldAt ? new Date(sale.soldAt).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-2 space-x-2">
                        {sale.status === 'pending' && (
                          <button
                            onClick={() => confirmSale(sale.id)}
                            className="bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-700 min-h-[44px]"
                          >
                            Confirm
                          </button>
                        )}
                        <button
                          onClick={() => recordPayment(sale.id)}
                          className="bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700 min-h-[44px]"
                        >
                          Record Payment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y">
              {filteredSales.map((sale) => (
                <div key={sale.id} className="p-4">
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold">{sale.vehicle?.year} {sale.vehicle?.make} {sale.vehicle?.model}</span>
                    <span className={`px-2 py-1 rounded text-xs ${sale.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{sale.status}</span>
                  </div>
                  <p className="text-sm text-gray-600">{sale.lead?.dealer?.name} • Ref: {sale.refCode || sale.lead?.referralCode || '-'}</p>
                  <p className="text-sm">Sale ${sale.salePrice?.toLocaleString()} • Commission ${sale.commissionAmount?.toFixed(2)} ({sale.commissionRate}%)</p>
                  <div className="flex gap-2 mt-2">
                    {sale.status === 'pending' && <button onClick={() => confirmSale(sale.id)} className="bg-blue-600 text-white px-3 py-2 rounded text-sm min-h-[44px]">Confirm</button>}
                    <button onClick={() => recordPayment(sale.id)} className="bg-green-600 text-white px-3 py-2 rounded text-sm min-h-[44px]">Record Payment</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      
      {activeTab === 'commissions' && (
        <>
          <h2 className="text-xl font-bold mb-4">Commission by Referral Code</h2>
          <div className="bg-white rounded shadow overflow-hidden">
            <div className="hidden md:block">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Referral Code</th>
                    <th className="px-4 py-2 text-left">Sales Count</th>
                    <th className="px-4 py-2 text-left">Total Sales</th>
                    <th className="px-4 py-2 text-left">Total Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionByRef().map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2 font-semibold">{row.ref}</td>
                      <td className="px-4 py-2">{row.count}</td>
                      <td className="px-4 py-2">${row.totalSales.toLocaleString()}</td>
                      <td className="px-4 py-2">${row.totalCommission.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y">
              {commissionByRef().map((row, i) => (
                <div key={i} className="p-4">
                  <p className="font-semibold">{row.ref}</p>
                  <p className="text-sm text-gray-600">{row.count} sales • ${row.totalSales.toLocaleString()}</p>
                  <p className="text-sm font-semibold">Commission: ${row.totalCommission.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      
      {activeTab === 'qr' && (
        <>
          <h2 className="text-xl font-bold mb-4">QR Codes per Vehicle</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.filter(v => v.status === 'available').map(vehicle => (
              <div key={vehicle.id} className="bg-white p-4 rounded shadow text-center">
                <p className="font-semibold mb-2">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                <div className="flex justify-center mb-2">
                  <QRCodeSVG value={`${window.location.origin}/car/${vehicle.id}`} size={128} />
                </div>
                <p className="text-xs text-gray-600 mb-2 break-all">{window.location.origin}/car/{vehicle.id}</p>
                <button onClick={() => setShowQR(vehicle)} className="bg-blue-600 text-white px-3 py-2 rounded text-sm min-h-[44px]">View Large</button>
              </div>
            ))}
          </div>
          {showQR && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowQR(null)}>
              <div className="bg-white p-6 rounded-lg text-center" onClick={(e) => e.stopPropagation()}>
                <p className="font-bold mb-4">{showQR.year} {showQR.make} {showQR.model}</p>
                <QRCodeSVG value={`${window.location.origin}/car/${showQR.id}`} size={256} />
                <p className="text-xs text-gray-600 mt-2 mb-4 break-all">{window.location.origin}/car/{showQR.id}</p>
                <button onClick={() => setShowQR(null)} className="bg-gray-500 text-white px-4 py-2 rounded min-h-[44px]">Close</button>
              </div>
            </div>
          )}
        </>
      )}
      
      {activeTab === 'overview' && (
        <>
          <h2 className="text-xl font-bold mb-4">Recent Payments</h2>
          <div className="bg-white rounded shadow overflow-hidden">
            <div className="hidden md:block">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Amount</th>
                    <th className="px-4 py-2 text-left">Reference</th>
                    <th className="px-4 py-2 text-left">Vehicle</th>
                    <th className="px-4 py-2 text-left">Dealer</th>
                    <th className="px-4 py-2 text-left">Paid At</th>
                    <th className="px-4 py-2 text-left">Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-t">
                      <td className="px-4 py-2">${payment.amount}</td>
                      <td className="px-4 py-2">{payment.paymentReference || 'N/A'}</td>
                      <td className="px-4 py-2">
                        {payment.sale?.vehicle?.year} {payment.sale?.vehicle?.make} {payment.sale?.vehicle?.model}
                      </td>
                      <td className="px-4 py-2">{payment.sale?.lead?.dealer?.name || '-'}</td>
                      <td className="px-4 py-2">{new Date(payment.paidAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2">{payment.recordedBy?.name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y">
              {payments.map((payment) => (
                <div key={payment.id} className="p-4">
                  <p className="font-semibold">${payment.amount} {payment.paymentReference && `• ${payment.paymentReference}`}</p>
                  <p className="text-sm text-gray-600">{payment.sale?.vehicle?.year} {payment.sale?.vehicle?.make} {payment.sale?.vehicle?.model}</p>
                  <p className="text-sm text-gray-600">{payment.sale?.lead?.dealer?.name} • {new Date(payment.paidAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
