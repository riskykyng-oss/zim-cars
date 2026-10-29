import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { assetUrl } from '../../utils/assets';
import { MessageCircle, Filter, X } from 'lucide-react';

const Marketplace = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ 
    make: searchParams.get('make') || '', 
    minPrice: searchParams.get('minPrice') || '', 
    maxPrice: searchParams.get('maxPrice') || '', 
    year: searchParams.get('year') || '',
    transmission: searchParams.get('transmission') || '',
    dutyPaid: searchParams.get('dutyPaid') || ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.make) params.set('make', filters.make);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters.year) params.set('year', filters.year);
    if (filters.transmission) params.set('transmission', filters.transmission);
    if (filters.dutyPaid) params.set('dutyPaid', filters.dutyPaid);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    setSearchParams(params, { replace: true });
    fetchVehicles();
  }, [filters, sortBy]);
  
  const fetchVehicles = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.make) params.append('make', filters.make);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      
      const res = await api.get(`/vehicles/public?${params.toString()}`);
      let data = res.data;
      
      if (filters.year) {
        data = data.filter(v => v.year && v.year.toString() === filters.year);
      }
      if (filters.transmission) {
        data = data.filter(v => v.transmission === filters.transmission);
      }
      if (filters.dutyPaid) {
        data = data.filter(v => String(v.dutyPaid) === filters.dutyPaid);
      }
      
      if (sortBy === 'cheapest') {
        data = [...data].sort((a, b) => a.price - b.price);
      } else if (sortBy === 'expensive') {
        data = [...data].sort((a, b) => b.price - a.price);
      } else {
        data = [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      
      setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getPrimaryImage = (vehicle) => {
    if (vehicle.images && vehicle.images.length > 0) {
      const primary = vehicle.images.find(img => img.isPrimary) || vehicle.images[0];
      return assetUrl(primary.url);
    }
    return null;
  };
  
  const handleQuickWhatsApp = async (e, vehicle) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const waRes = await api.get(`/leads/whatsapp/${vehicle.id}`);
      window.open(waRes.data.whatsappUrl, '_blank');
    } catch (error) {
      console.error('Error generating WhatsApp link:', error);
      alert('Error generating WhatsApp link');
    }
  };
  
  const clearFilters = () => {
    setFilters({ make: '', minPrice: '', maxPrice: '', year: '', transmission: '', dutyPaid: '' });
    setSortBy('newest');
  };
  
  const uniqueMakes = [...new Set(vehicles.map(v => v.make).filter(Boolean))];
  const years = [...new Set(vehicles.map(v => v.year).filter(Boolean))].sort((a,b) => b-a);
  
  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Browse Cars</h1>
        <p className="text-gray-600">{vehicles.length} result{vehicles.length !== 1 ? 's' : ''}</p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters Sidebar */}
        <div className="lg:w-72 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6 lg:sticky lg:top-20">
            <div className="flex justify-between items-center mb-4 lg:mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden text-blue-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                {showFilters ? <X className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
              </button>
            </div>
            
            <div className={`space-y-4 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg min-h-[44px]"
                >
                  <option value="newest">Newest</option>
                  <option value="cheapest">Price low-high</option>
                  <option value="expensive">Price high-low</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
                <select
                  value={filters.make}
                  onChange={(e) => setFilters({...filters, make: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg min-h-[44px]"
                >
                  <option value="">All makes</option>
                  {uniqueMakes.map(make => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <select
                  value={filters.year}
                  onChange={(e) => setFilters({...filters, year: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg min-h-[44px]"
                >
                  <option value="">All years</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transmission</label>
                <select
                  value={filters.transmission}
                  onChange={(e) => setFilters({...filters, transmission: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg min-h-[44px]"
                >
                  <option value="">Any</option>
                  <option value="Manual">Manual</option>
                  <option value="Automatic">Automatic</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duty paid</label>
                <select
                  value={filters.dutyPaid}
                  onChange={(e) => setFilters({...filters, dutyPaid: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg min-h-[44px]"
                >
                  <option value="">Any</option>
                  <option value="true">Duty Paid</option>
                  <option value="false">Duty Not Paid</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min price ($)</label>
                <input
                  type="number"
                  placeholder="e.g., 5000"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg min-h-[44px]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max price ($)</label>
                <input
                  type="number"
                  placeholder="e.g., 15000"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg min-h-[44px]"
                />
              </div>
              
              <button
                onClick={clearFilters}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>
        
        {/* Vehicles Grid */}
        <div className="flex-1">
          {vehicles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-600 text-lg mb-2">No cars match your filters</p>
              <p className="text-gray-500 text-sm mb-4">Try adjusting your filters or clearing them.</p>
              <button onClick={clearFilters} className="text-blue-600 hover:underline">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow border border-gray-100">
                  <Link to={`/vehicle/${vehicle.id}`}>
                    <div className="h-48 bg-gray-200 aspect-[4/3]">
                      {getPrimaryImage(vehicle) ? (
                        <img src={getPrimaryImage(vehicle)} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">No photo</div>
                      )}
                    </div>
                  </Link>
                  <div className="p-4">
                    <Link to={`/vehicle/${vehicle.id}`}>
                      <h2 className="text-lg font-semibold mb-1 hover:text-blue-600 transition-colors">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h2>
                    </Link>
                    <p className="text-xl font-bold text-blue-600 mb-2">${vehicle.price.toLocaleString()}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-2">
                      {vehicle.mileage && <span>{vehicle.mileage.toLocaleString()} km</span>}
                      {vehicle.transmission && <span>• {vehicle.transmission}</span>}
                      {vehicle.fuelType && <span>• {vehicle.fuelType}</span>}
                    </div>
                    <div className="mb-2">
                      {vehicle.dutyPaid ? (
                        <span className="inline-block px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded">Duty Paid</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">Duty Not Paid</span>
                      )}
                      {vehicle.location && <span className="ml-2 text-xs text-gray-500">{vehicle.location}</span>}
                    </div>
                    <p className="text-xs text-gray-500 mb-3">Dealer: {vehicle.dealer.name}</p>
                    <div className="flex gap-2">
                      <Link
                        to={`/vehicle/${vehicle.id}`}
                        className="flex-1 bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm min-h-[44px] flex items-center justify-center"
                      >
                        Details
                      </Link>
                      <button
                        onClick={(e) => handleQuickWhatsApp(e, vehicle)}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 min-h-[44px] min-w-[44px] justify-center"
                        title="Chat on WhatsApp"
                        aria-label="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
