import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const DealerDashboard = () => {
  const [activeTab, setActiveTab] = useState('vehicles');
  const [vehicles, setVehicles] = useState([]);
  const [leads, setLeads] = useState([]);
  const [sales, setSales] = useState([]);
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
      const [vehiclesRes, leadsRes, salesRes] = await Promise.all([
        api.get('/vehicles'),
        api.get('/leads'),
        api.get('/sales')
      ]);
      setVehicles(vehiclesRes.data);
      setLeads(leadsRes.data);
      setSales(salesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
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
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    setUploading(true);
    try {
      await api.post(`/vehicles/${vehicleId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchData();
      setSelectedVehicle(null);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image');
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
      
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`px-4 py-2 rounded ${activeTab === 'vehicles' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Vehicles ({vehicles.length})
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-2 rounded ${activeTab === 'leads' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Leads ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 rounded ${activeTab === 'sales' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Sales ({sales.length})
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
              <div className="bg-white p-6 rounded-lg w-96">
                <h3 className="text-lg font-bold mb-4">Upload Image for {selectedVehicle.make} {selectedVehicle.model}</h3>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, selectedVehicle.id)}
                  disabled={uploading}
                  className="mb-4"
                />
                {uploading && <p className="text-blue-600 mb-2">Uploading...</p>}
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
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
    </div>
  );
};

export default DealerDashboard;
