import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const DealerDashboard = () => {
  const [activeTab, setActiveTab] = useState('vehicles');
  const [vehicles, setVehicles] = useState([]);
  const [leads, setLeads] = useState([]);
  const [sales, setSales] = useState([]);
  const [verification, setVerification] = useState(null);
  const [verificationDocs, setVerificationDocs] = useState([]);
  const [docType, setDocType] = useState('national_id');
  const [docFile, setDocFile] = useState(null);
  const [docNotes, setDocNotes] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [payments, setPayments] = useState([]);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ type: 'subscription', amount: '2', method: 'ecocash', reference: '', senderName: '' });
  const [proofFile, setProofFile] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    make: '', model: '', year: '', price: '', description: ''
  });
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState({
    id: '', make: '', model: '', year: '', price: '', description: '', status: ''
  });
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      const [vehiclesRes, leadsRes, salesRes, verificationRes, paymentsRes, paymentInfoRes] = await Promise.all([
        api.get('/vehicles'),
        api.get('/leads'),
        api.get('/sales'),
        api.get('/auth/dealer/verify').catch(() => ({ data: { dealer: null, verifications: [] } })),
        api.get('/payments/my').catch(() => ({ data: [] })),
        api.get('/payments/info').catch(() => ({ data: null }))
      ]);
      setVehicles(vehiclesRes.data);
      setLeads(leadsRes.data);
      setSales(salesRes.data);
      setVerification(verificationRes.data.dealer);
      setVerificationDocs(verificationRes.data.verifications || []);
      setPayments(paymentsRes.data);
      setPaymentInfo(paymentInfoRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleDocUpload = async (e) => {
    e.preventDefault();
    if (!docFile) {
      alert('Select a document file');
      return;
    }
    const formData = new FormData();
    formData.append('document', docFile);
    formData.append('type', docType);
    formData.append('notes', docNotes);
    setUploadingDoc(true);
    try {
      await api.post('/auth/dealer/verify/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDocFile(null);
      setDocNotes('');
      fetchData();
      alert('Document uploaded for review');
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error uploading document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('type', paymentForm.type);
    formData.append('amount', paymentForm.amount);
    formData.append('method', paymentForm.method);
    formData.append('reference', paymentForm.reference);
    formData.append('senderName', paymentForm.senderName);
    if (proofFile) formData.append('proof', proofFile);
    setSubmittingPayment(true);
    try {
      await api.post('/payments/submit', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProofFile(null);
      setPaymentForm({ type: 'subscription', amount: '2', method: 'ecocash', reference: '', senderName: '' });
      fetchData();
      alert('Payment submitted. Awaiting admin approval.');
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert(error.response?.data?.error || 'Error submitting payment');
    } finally {
      setSubmittingPayment(false);
    }
  };
  
  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      await api.post('/vehicles', newVehicle);
      setShowAddVehicle(false);
      setNewVehicle({ make: '', model: '', year: '', price: '', description: '' });
      fetchData();
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert('Error adding vehicle');
    }
  };
  
  const openEditModal = (vehicle) => {
    setEditVehicle({
      id: vehicle.id,
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year || '',
      price: vehicle.price || '',
      description: vehicle.description || '',
      status: vehicle.status || 'available'
    });
    setShowEditModal(true);
  };
  
  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        make: editVehicle.make,
        model: editVehicle.model,
        year: editVehicle.year ? parseInt(editVehicle.year) : null,
        price: parseFloat(editVehicle.price),
        description: editVehicle.description,
        status: editVehicle.status
      };
      await api.put(`/vehicles/${editVehicle.id}`, payload);
      setShowEditModal(false);
      fetchData();
    } catch (error) {
      console.error('Error updating vehicle:', error);
      alert('Error updating vehicle');
    }
  };
  
  const toggleVehicleStatus = async (vehicleId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'available' ? 'unpublished' : 'available';
      await api.put(`/vehicles/${vehicleId}`, { status: newStatus });
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };
  
  const handleImageUpload = async (e, vehicleId) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const formData = new FormData();
    if (files.length === 1) {
      formData.append('image', files[0]);
    } else {
      files.forEach((file) => formData.append('images', file));
    }
    
    setUploading(true);
    try {
      if (files.length === 1) {
        await api.post(`/vehicles/${vehicleId}/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post(`/vehicles/${vehicleId}/images`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      fetchData();
      e.target.value = '';
      alert('Images uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading images');
    } finally {
      setUploading(false);
    }
  };
  
  const updateLeadStatus = async (leadId, status) => {
    try {
      await api.put(`/leads/${leadId}`, { status });
      fetchData();
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };
  
  const createSale = async (leadId) => {
    const salePrice = prompt('Enter sale price:');
    if (!salePrice) return;
    try {
      await api.post('/sales', { leadId, salePrice });
      fetchData();
    } catch (error) {
      console.error('Error creating sale:', error);
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dealer Dashboard</h1>
      
      <div className="bg-white rounded shadow p-6 mb-6">
        <h2 className="text-lg font-bold mb-3">Onboarding Checklist</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${verification?.ownerFullName ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{verification?.ownerFullName ? '✓' : '1'}</span>
            <span className={verification?.ownerFullName ? 'text-gray-700' : 'text-gray-900 font-medium'}>Complete registration details</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${verificationDocs.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{verificationDocs.length > 0 ? '✓' : '2'}</span>
            <span className={verificationDocs.length > 0 ? 'text-gray-700' : 'text-gray-900 font-medium'}>Upload National ID/Passport & Proof of Address</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${verification?.verificationStatus === 'verified' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{verification?.verificationStatus === 'verified' ? '✓' : '3'}</span>
            <span className={verification?.verificationStatus === 'verified' ? 'text-gray-700' : 'text-gray-900 font-medium'}>Await admin verification & approval</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${payments.some(p => p.status === 'approved') || verification?.status === 'trial' || verification?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{payments.some(p => p.status === 'approved') || verification?.status === 'trial' || verification?.status === 'active' ? '✓' : '4'}</span>
            <span className={payments.some(p => p.status === 'approved') || verification?.status === 'trial' || verification?.status === 'active' ? 'text-gray-700' : 'text-gray-900 font-medium'}>Activate account (Trial/Subscription)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${verification?.status === 'trial' || verification?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{verification?.status === 'trial' || verification?.status === 'active' ? '✓' : '5'}</span>
            <span className={verification?.status === 'trial' || verification?.status === 'active' ? 'text-gray-700' : 'text-gray-900 font-medium'}>Start listing vehicles</span>
          </div>
        </div>
        {(verification?.status === 'trial' || verification?.status === 'active') && (
          <div className="mt-4">
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/dealers/${verification?.slug || ''}`);
                alert('Public page link copied!');
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 min-h-[44px]"
            >
              View/Copy My Public Page
            </button>
          </div>
        )}
      </div>

      {verification?.verificationStatus !== 'verified' && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-6">
          <h3 className="font-semibold text-yellow-800 mb-1">Account Pending Verification</h3>
          <p className="text-sm text-yellow-700">
            You must upload a clear copy of your National ID/Passport and proof of address. Admin approval is required before you can add vehicles. Only legitimate verification profiles are approved.
          </p>
        </div>
      )}
      {verification?.status === 'pending_payment' && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-6">
          <h3 className="font-semibold text-blue-800 mb-1">Payment Required</h3>
          <p className="text-sm text-blue-700">
            Submit your payment proof below. EcoCash: <strong>{paymentInfo?.ecocash || '0773412018'}</strong> • Joining $3 (one-time) • Subscription $2/month
          </p>
        </div>
      )}
      {verification?.status === 'expired' && (
        <div className="bg-red-50 border border-red-200 p-4 rounded mb-6">
          <h3 className="font-semibold text-red-800 mb-1">Subscription Expired</h3>
          <p className="text-sm text-red-700">Renew your subscription to continue listing vehicles.</p>
        </div>
      )}
      {verification?.status === 'trial' && verification?.trialEndsAt && (() => {
        const daysLeft = Math.ceil((new Date(verification.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 7 && daysLeft > 0) {
          return (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded mb-6">
              <h3 className="font-semibold text-orange-800 mb-1">Trial Expiring Soon</h3>
              <p className="text-sm text-orange-700">Your free trial expires in {daysLeft} day{daysLeft === 1 ? '' : 's'} ({new Date(verification.trialEndsAt).toLocaleDateString()}). Subscribe to continue listing after expiry.</p>
            </div>
          );
        }
        if (daysLeft > 7) {
          return (
            <div className="bg-green-50 border border-green-200 p-4 rounded mb-6">
              <p className="text-sm text-green-700">2-month free trial active until {new Date(verification.trialEndsAt).toLocaleDateString()}.</p>
            </div>
          );
        }
        return null;
      })()}
      {verification?.status === 'active' && verification?.subscriptionEndsAt && (() => {
        const daysLeft = Math.ceil((new Date(verification.subscriptionEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 7 && daysLeft > 0) {
          return (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded mb-6">
              <h3 className="font-semibold text-orange-800 mb-1">Subscription Expiring Soon</h3>
              <p className="text-sm text-orange-700">Your subscription expires in {daysLeft} day{daysLeft === 1 ? '' : 's'} ({new Date(verification.subscriptionEndsAt).toLocaleDateString()}). Renew to avoid interruption.</p>
            </div>
          );
        }
        return null;
      })()}

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`px-4 py-2 rounded min-h-[44px] ${activeTab === 'vehicles' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Vehicles ({vehicles.length})
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-2 rounded min-h-[44px] ${activeTab === 'leads' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Leads ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 rounded min-h-[44px] ${activeTab === 'sales' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Sales ({sales.length})
        </button>
        <button
          onClick={() => setActiveTab('verification')}
          className={`px-4 py-2 rounded min-h-[44px] ${activeTab === 'verification' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Verification & Payments
        </button>
      </div>
      
      {activeTab === 'vehicles' && (
        <div>
          <button
            onClick={() => setShowAddVehicle(true)}
            className="bg-green-600 text-white px-4 py-2 rounded mb-4 hover:bg-green-700 min-h-[44px]"
          >
            Add Vehicle
          </button>
          
          {showAddVehicle && (
            <div className="bg-white p-4 rounded shadow mb-4">
              <form onSubmit={handleAddVehicle} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Make"
                  value={newVehicle.make}
                  onChange={(e) => setNewVehicle({...newVehicle, make: e.target.value})}
                  className="p-2 border rounded min-h-[44px]"
                  required
                />
                <input
                  type="text"
                  placeholder="Model"
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})}
                  className="p-2 border rounded min-h-[44px]"
                  required
                />
                <input
                  type="number"
                  placeholder="Year"
                  value={newVehicle.year}
                  onChange={(e) => setNewVehicle({...newVehicle, year: e.target.value})}
                  className="p-2 border rounded min-h-[44px]"
                />
                <input
                  type="number"
                  placeholder="Price ($)"
                  value={newVehicle.price}
                  onChange={(e) => setNewVehicle({...newVehicle, price: e.target.value})}
                  className="p-2 border rounded min-h-[44px]"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={newVehicle.description}
                  onChange={(e) => setNewVehicle({...newVehicle, description: e.target.value})}
                  className="p-2 border rounded col-span-1 md:col-span-2"
                />
                <div className="col-span-1 md:col-span-2 flex gap-2">
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded min-h-[44px]">Save</button>
                  <button type="button" onClick={() => setShowAddVehicle(false)} className="bg-gray-500 text-white px-4 py-2 rounded min-h-[44px]">Cancel</button>
                </div>
              </form>
            </div>
          )}
          
          <div className="bg-white rounded shadow overflow-hidden">
            {vehicles.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <p className="mb-2">No vehicles yet.</p>
                <p className="text-sm text-gray-500">Add your first vehicle to get started.</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Vehicle</th>
                        <th className="px-4 py-2 text-left">Year</th>
                        <th className="px-4 py-2 text-left">Price</th>
                        <th className="px-4 py-2 text-left">Images</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map((vehicle) => (
                        <tr key={vehicle.id} className="border-t">
                          <td className="px-4 py-2">{vehicle.make} {vehicle.model}</td>
                          <td className="px-4 py-2">{vehicle.year || '-'}</td>
                          <td className="px-4 py-2">${vehicle.price?.toLocaleString()}</td>
                          <td className="px-4 py-2">{vehicle.images?.length || 0}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              vehicle.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {vehicle.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 flex flex-wrap gap-2">
                            <button
                              onClick={() => openEditModal(vehicle)}
                              className="bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-700 min-h-[44px]"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setSelectedVehicle(vehicle)}
                              className="bg-purple-600 text-white px-2 py-1 rounded text-sm hover:bg-purple-700 min-h-[44px]"
                            >
                              Upload Image
                            </button>
                            {vehicle.images && vehicle.images.length > 0 ? (
                              <button
                                onClick={() => toggleVehicleStatus(vehicle.id, vehicle.status)}
                                className={`px-2 py-1 rounded text-sm min-h-[44px] ${
                                  vehicle.status === 'available' 
                                    ? 'bg-orange-600 text-white hover:bg-orange-700' 
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                              >
                                {vehicle.status === 'available' ? 'Unpublish' : 'Publish'}
                              </button>
                            ) : (
                              <span className="text-xs text-red-600 font-semibold flex items-center">Upload photo to publish</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden divide-y">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="p-4">
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold">{vehicle.make} {vehicle.model} {vehicle.year || ''}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          vehicle.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>{vehicle.status}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">${vehicle.price?.toLocaleString()} • {vehicle.images?.length || 0} images</p>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => openEditModal(vehicle)} className="bg-blue-600 text-white px-3 py-2 rounded text-sm min-h-[44px]">Edit</button>
                        <button onClick={() => setSelectedVehicle(vehicle)} className="bg-purple-600 text-white px-3 py-2 rounded text-sm min-h-[44px]">Upload Image</button>
                        {vehicle.images && vehicle.images.length > 0 ? (
                          <button onClick={() => toggleVehicleStatus(vehicle.id, vehicle.status)} className={`px-3 py-2 rounded text-sm min-h-[44px] ${vehicle.status === 'available' ? 'bg-orange-600 text-white' : 'bg-green-600 text-white'}`}>
                            {vehicle.status === 'available' ? 'Unpublish' : 'Publish'}
                          </button>
                        ) : (
                          <span className="text-xs text-red-600 flex items-center">Upload photo to publish</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          
          {selectedVehicle && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-full max-w-md mx-4">
                <h3 className="text-lg font-bold mb-2">Upload Images for {selectedVehicle.make} {selectedVehicle.model}</h3>
                <p className="text-sm text-gray-600 mb-3">Upload at least 4 photos (Exterior, Interior, Engine & Other). You can select multiple images at once.</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e, selectedVehicle.id)}
                  disabled={uploading}
                  className="mb-4 w-full"
                />
                {uploading && <p className="text-blue-600 mb-2">Uploading...</p>}
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          )}
          
          {showEditModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-full max-w-lg">
                <h3 className="text-lg font-bold mb-4">Edit Vehicle</h3>
                <form onSubmit={handleUpdateVehicle} className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Make"
                    value={editVehicle.make}
                    onChange={(e) => setEditVehicle({...editVehicle, make: e.target.value})}
                    className="p-2 border rounded"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Model"
                    value={editVehicle.model}
                    onChange={(e) => setEditVehicle({...editVehicle, model: e.target.value})}
                    className="p-2 border rounded"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Year"
                    value={editVehicle.year}
                    onChange={(e) => setEditVehicle({...editVehicle, year: e.target.value})}
                    className="p-2 border rounded"
                  />
                  <input
                    type="number"
                    placeholder="Price (USD)"
                    value={editVehicle.price}
                    onChange={(e) => setEditVehicle({...editVehicle, price: e.target.value})}
                    className="p-2 border rounded"
                    required
                  />
                  <select
                    value={editVehicle.status}
                    onChange={(e) => setEditVehicle({...editVehicle, status: e.target.value})}
                    className="p-2 border rounded col-span-2"
                  >
                    <option value="available">Available (Published)</option>
                    <option value="unpublished">Unpublished</option>
                    <option value="sold">Sold</option>
                  </select>
                  <textarea
                    placeholder="Description"
                    value={editVehicle.description}
                    onChange={(e) => setEditVehicle({...editVehicle, description: e.target.value})}
                    className="p-2 border rounded col-span-2"
                    rows="4"
                  />
                  <div className="col-span-2 flex space-x-2">
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Save Changes</button>
                    <button type="button" onClick={() => setShowEditModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'leads' && (
        <div className="bg-white rounded shadow overflow-hidden">
          {leads.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <p className="mb-2">No leads yet.</p>
              <p className="text-sm text-gray-500">Leads will appear here when buyers enquire.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Lead ID</th>
                      <th className="px-4 py-2 text-left">Buyer</th>
                      <th className="px-4 py-2 text-left">Phone</th>
                      <th className="px-4 py-2 text-left">Vehicle</th>
                      <th className="px-4 py-2 text-left">Ref</th>
                      <th className="px-4 py-2 text-left">Source</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-t">
                        <td className="px-4 py-2 text-sm font-mono">{lead.leadId || '-'}</td>
                        <td className="px-4 py-2">{lead.buyerName || 'N/A'}</td>
                        <td className="px-4 py-2">{lead.buyerPhone}</td>
                        <td className="px-4 py-2">
                          {lead.vehicle ? `${lead.vehicle.year || ''} ${lead.vehicle.make} ${lead.vehicle.model}` : 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-sm">{lead.referralCode || '-'}</td>
                        <td className="px-4 py-2">{lead.source}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            lead.status === 'sold' ? 'bg-green-100 text-green-800' :
                            lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                            lead.status === 'lost' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 space-x-2">
                          <select
                            value={lead.status}
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                            className="p-1 border rounded text-sm min-h-[44px]"
                          >
                            <option value="new">new</option>
                            <option value="contacted">contacted</option>
                            <option value="sold">sold</option>
                            <option value="lost">lost</option>
                          </select>
                          {lead.status !== 'sold' && !lead.sale && (
                            <button
                              onClick={() => {
                                const price = prompt('Sale price ($)');
                                if (!price) return;
                                api.post('/sales', { leadId: lead.id, salePrice: price }).then(() => fetchData());
                              }}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 min-h-[44px]"
                            >
                              Mark sold
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y">
                {leads.map((lead) => (
                  <div key={lead.id} className="p-4">
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">{lead.leadId || lead.id.substring(0,8)}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        lead.status === 'sold' ? 'bg-green-100 text-green-800' :
                        lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                        lead.status === 'lost' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>{lead.status}</span>
                    </div>
                    <p className="text-sm text-gray-600">{lead.buyerName || 'N/A'} • {lead.buyerPhone}</p>
                    <p className="text-sm text-gray-600 mb-2">{lead.vehicle ? `${lead.vehicle.year || ''} ${lead.vehicle.make} ${lead.vehicle.model}` : 'N/A'} • Ref: {lead.referralCode || '-'}</p>
                    <div className="flex gap-2">
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                        className="p-2 border rounded text-sm flex-1 min-h-[44px]"
                      >
                        <option value="new">new</option>
                        <option value="contacted">contacted</option>
                        <option value="sold">sold</option>
                        <option value="lost">lost</option>
                      </select>
                      {lead.status !== 'sold' && !lead.sale && (
                        <button
                          onClick={() => {
                            const price = prompt('Sale price ($)');
                            if (!price) return;
                            api.post('/sales', { leadId: lead.id, salePrice: price }).then(() => fetchData());
                          }}
                          className="bg-green-600 text-white px-3 py-2 rounded text-sm min-h-[44px]"
                        >
                          Mark sold
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      
      {activeTab === 'sales' && (
        <div className="bg-white rounded shadow overflow-hidden">
          {sales.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <p className="mb-2">No sales yet.</p>
              <p className="text-sm text-gray-500">Mark a lead as sold to see it here.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Vehicle</th>
                      <th className="px-4 py-2 text-left">Ref</th>
                      <th className="px-4 py-2 text-left">Sale Price</th>
                      <th className="px-4 py-2 text-left">Commission Rate</th>
                      <th className="px-4 py-2 text-left">Commission</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <tr key={sale.id} className="border-t">
                        <td className="px-4 py-2">
                          {sale.vehicle.year || ''} {sale.vehicle.make} {sale.vehicle.model}
                        </td>
                        <td className="px-4 py-2 text-sm">{sale.refCode || sale.lead?.referralCode || '-'}</td>
                        <td className="px-4 py-2">${sale.salePrice.toLocaleString()}</td>
                        <td className="px-4 py-2">{sale.commissionRate}%</td>
                        <td className="px-4 py-2">${sale.commissionAmount.toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            sale.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {sale.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">{new Date(sale.soldAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y">
                {sales.map((sale) => (
                  <div key={sale.id} className="p-4">
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold">{sale.vehicle.year} {sale.vehicle.make} {sale.vehicle.model}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        sale.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>{sale.status}</span>
                    </div>
                    <p className="text-sm text-gray-600">Ref: {sale.refCode || sale.lead?.referralCode || '-'}</p>
                    <p className="text-sm">Sale ${sale.salePrice.toLocaleString()} • Commission ${sale.commissionAmount.toFixed(2)} ({sale.commissionRate}%)</p>
                    <p className="text-xs text-gray-500">{new Date(sale.soldAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'verification' && (
        <div className="space-y-6">
          <div className="bg-white rounded shadow p-6">
            <h2 className="text-xl font-bold mb-2">Verification Status</h2>
            <p className="mb-4">
              Status: <span className="font-semibold capitalize">{verification?.verificationStatus || 'pending'}</span> {verification?.rejectionReason && <span className="text-red-600">• {verification.rejectionReason}</span>}
            </p>
            <p className="text-sm text-gray-600 mb-4">Upload clear, readable copies. We only approve dealers with a legitimate verification profile.</p>
            <form onSubmit={handleDocUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select value={docType} onChange={(e) => setDocType(e.target.value)} className="p-2 border rounded min-h-[44px]">
                <option value="national_id">National ID</option>
                <option value="passport">Passport</option>
                <option value="proof_of_address">Proof of Address (utility bill)</option>
                <option value="business_registration">Business Registration</option>
                <option value="other">Other</option>
              </select>
              <input type="file" accept="image/*,application/pdf" onChange={(e) => setDocFile(e.target.files[0])} className="p-2 border rounded min-h-[44px]" />
              <input type="text" placeholder="Notes (optional)" value={docNotes} onChange={(e) => setDocNotes(e.target.value)} className="p-2 border rounded md:col-span-2 min-h-[44px]" />
              <button type="submit" disabled={uploadingDoc} className="bg-blue-600 text-white px-4 py-2 rounded min-h-[44px] md:col-span-2 disabled:opacity-50">{uploadingDoc ? 'Uploading...' : 'Upload Document'}</button>
            </form>
            {verificationDocs.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Uploaded Documents</h3>
                <ul className="space-y-2">
                  {verificationDocs.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between border p-3 rounded">
                      <div>
                        <p className="capitalize">{doc.type.replace('_', ' ')}</p>
                        <p className="text-xs text-gray-500">{new Date(doc.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">View</a>
                        <span className={`px-2 py-1 rounded text-xs ${doc.status === 'approved' ? 'bg-green-100 text-green-800' : doc.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{doc.status}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-white rounded shadow p-6">
            <h2 className="text-xl font-bold mb-2">Payments</h2>
            <p className="text-sm text-gray-600 mb-4">EcoCash: <strong>{paymentInfo?.ecocash || '0773412018'}</strong> • Pricing: Joining $3, Subscription $2/month, Commission 3%</p>
            <form onSubmit={handlePaymentSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <select value={paymentForm.type} onChange={(e) => setPaymentForm({...paymentForm, type: e.target.value})} className="p-2 border rounded min-h-[44px]">
                <option value="subscription">Subscription ($2)</option>
                <option value="joining">Joining Fee ($3)</option>
              </select>
              <input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})} className="p-2 border rounded min-h-[44px]" />
              <select value={paymentForm.method} onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})} className="p-2 border rounded min-h-[44px]">
                <option value="ecocash">EcoCash</option>
                <option value="innbucks">InnBucks</option>
                <option value="onemoney">OneMoney</option>
              </select>
              <input type="text" placeholder="Transaction Reference" value={paymentForm.reference} onChange={(e) => setPaymentForm({...paymentForm, reference: e.target.value})} className="p-2 border rounded min-h-[44px]" />
              <input type="text" placeholder="Sender Name (must match EcoCash)" value={paymentForm.senderName} onChange={(e) => setPaymentForm({...paymentForm, senderName: e.target.value})} className="p-2 border rounded md:col-span-2 min-h-[44px]" />
              <input type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files[0])} className="p-2 border rounded md:col-span-2 min-h-[44px]" />
              <button type="submit" disabled={submittingPayment} className="bg-green-600 text-white px-4 py-2 rounded min-h-[44px] md:col-span-2 disabled:opacity-50">{submittingPayment ? 'Submitting...' : 'Submit Payment Proof'}</button>
            </form>
            <h3 className="font-semibold mb-2">Payment History</h3>
            <div className="divide-y">
              {payments.length === 0 ? <p className="text-sm text-gray-500">No payments yet.</p> : payments.map((p) => (
                <div key={p.id} className="py-3 flex justify-between">
                  <div>
                    <p className="capitalize">{p.type} • ${p.amount} • {p.method}</p>
                    <p className="text-xs text-gray-500">{p.reference || 'No ref'} {p.senderName && `• ${p.senderName}`}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs self-start ${p.status === 'approved' ? 'bg-green-100 text-green-800' : p.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealerDashboard;
