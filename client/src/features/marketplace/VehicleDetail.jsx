import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { assetUrl } from '../../utils/assets';
import { MessageCircle, ArrowLeft, Phone, User, ShieldCheck } from 'lucide-react';
import { getRef, captureRef } from '../../utils/ref';

const VehicleDetail = () => {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [refCode, setRefCode] = useState('');
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquirySent, setEnquirySent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    fetchVehicle();
    captureRef();
    setRefCode(getRef() || '');
  }, [id]);
  
  const fetchVehicle = async () => {
    try {
      const res = await api.get(`/vehicles/${id}`);
      setVehicle(res.data);
    } catch (error) {
      console.error('Error fetching vehicle:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const validatePhone = (phone) => {
    const cleaned = phone.replace(/\s/g, '').replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('+263')) {
      return /^\+263(77|78|71|73)[0-9]{7}$/.test(cleaned);
    }
    if (cleaned.startsWith('263')) {
      return /^263(77|78|71|73)[0-9]{7}$/.test(cleaned);
    }
    return /^(077|078|071|073)[0-9]{7}$/.test(cleaned);
  };
  
  const handleEnquiry = async (e) => {
    e.preventDefault();
    if (!buyerPhone.trim()) {
      alert('Enter your phone number.');
      return;
    }
    if (!validatePhone(buyerPhone)) {
      alert('Enter a valid Zimbabwe number (e.g., 0771234567 or +263771234567).');
      return;
    }
    setSubmitting(true);
    let leadResult = null;
    try {
      const leadRes = await api.post('/leads', {
        vehicleId: vehicle.id,
        buyerName: buyerName.trim() || null,
        buyerPhone: buyerPhone.trim(),
        source: 'web',
        referralCode: refCode || undefined
      });
      leadResult = leadRes.data;
      setEnquirySent(true);
    } catch (error) {
      console.error('Error creating lead:', error);
    }
    try {
      const waRes = await api.get(`/leads/whatsapp/${vehicle.id}`, { 
        params: { ref: refCode, leadId: leadResult?.leadId } 
      });
      const url = waRes.data.whatsappUrl;
      window.location.href = url;
    } catch (error) {
      console.error('Error generating WhatsApp link:', error);
      alert('Could not open WhatsApp right now. Please try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;
  if (!vehicle) return <div className="flex items-center justify-center h-64">Vehicle not found</div>;
  
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-24 md:pb-8">
      <Link to="/cars" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Browse
      </Link>
      
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="h-64 md:h-96 bg-gray-200">
          {vehicle.images && vehicle.images.length > 0 ? (
            <img 
              src={assetUrl(vehicle.images[0].url)} 
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} 
              className="w-full h-full object-cover" 
              loading="lazy"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">No photo</div>
          )}
        </div>
        {vehicle.images && vehicle.images.length > 1 && (
          <div className="flex gap-2 p-4 overflow-x-auto bg-gray-50">
            {vehicle.images.slice(1).map((img) => (
              <img 
                key={img.id}
                src={assetUrl(img.url)} 
                alt="Vehicle" 
                className="h-24 w-32 object-cover rounded-lg flex-shrink-0" 
                loading="lazy"
              />
            ))}
          </div>
        )}
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold mb-2">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              <div className="flex items-center gap-3 flex-wrap text-sm text-gray-600">
                <span>Dealer: {vehicle.dealer.name}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Dealer
                </span>
              </div>
            </div>
            <div className="text-left md:text-right">
              <p className="text-2xl md:text-4xl font-bold text-blue-600">${vehicle.price.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            {vehicle.year && <div><p className="text-xs text-gray-500">Year</p><p className="font-medium">{vehicle.year}</p></div>}
            {vehicle.mileage && <div><p className="text-xs text-gray-500">Mileage</p><p className="font-medium">{vehicle.mileage.toLocaleString()} km</p></div>}
            {vehicle.transmission && <div><p className="text-xs text-gray-500">Transmission</p><p className="font-medium">{vehicle.transmission}</p></div>}
            {vehicle.fuelType && <div><p className="text-xs text-gray-500">Fuel</p><p className="font-medium">{vehicle.fuelType}</p></div>}
          </div>
          
          <div className="mb-4">
            {vehicle.dutyPaid ? (
              <span className="inline-block px-3 py-1 bg-green-50 text-green-700 text-sm rounded-lg">Duty Paid</span>
            ) : (
              <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">Duty Not Paid</span>
            )}
            {vehicle.location && <span className="ml-2 text-sm text-gray-600">Location: {vehicle.location}</span>}
          </div>
          
          {vehicle.description && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Description</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{vehicle.description}</p>
            </div>
          )}
          
          <div className="border-t pt-6 hidden md:block">
            {!enquirySent ? (
              <>
                <button
                  onClick={() => setShowEnquiry(true)}
                  className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 transition-colors text-lg font-semibold flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <MessageCircle className="w-5 h-5" />
                  Chat on WhatsApp
                </button>
                <p className="text-sm text-gray-500 mt-2">You'll be redirected to WhatsApp with your enquiry</p>
              </>
            ) : (
              <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg">
                <p className="font-semibold mb-1">✓ Enquiry sent</p>
                <p className="text-sm">WhatsApp should have opened with your pre-filled message.</p>
              </div>
            )}
            
            {showEnquiry && !enquirySent && (
              <div className="mt-6 p-6 bg-gray-50 rounded-xl max-w-md">
                <h3 className="text-lg font-semibold mb-4">Enter your details</h3>
                <form onSubmit={handleEnquiry}>
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-gray-700 mb-2 text-sm font-medium">
                      <User className="w-4 h-4" />
                      Name (optional)
                    </label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-gray-700 mb-2 text-sm font-medium">
                      <Phone className="w-4 h-4" />
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                      placeholder="0771234567 or +263771234567"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="text-gray-700 mb-2 text-sm font-medium block">Referral code</label>
                    <input
                      type="text"
                      value={refCode}
                      onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                      placeholder="Auto-filled if present"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {submitting ? 'Sending...' : 'Chat on WhatsApp'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEnquiry(false)}
                      className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors min-h-[44px]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Sticky mobile WhatsApp bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-200 md:hidden">
        {!enquirySent ? (
          <button
            onClick={() => setShowEnquiry(true)}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 min-h-[44px]"
          >
            <MessageCircle className="w-5 h-5" />
            Chat on WhatsApp
          </button>
        ) : (
          <div className="text-center text-green-700 font-medium">Enquiry sent</div>
        )}
      </div>
    </div>
  );
};

export default VehicleDetail;
