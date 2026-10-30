import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { MapPin, Phone } from 'lucide-react';

const DealerPortfolio = () => {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDealer = async () => {
      try {
        const res = await api.get(`/auth/dealers/public/${slug}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Dealer not found');
      } finally {
        setLoading(false);
      }
    };
    fetchDealer();
  }, [slug]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-4xl font-bold mb-3">Dealer not available</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <Link to="/cars" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold">
          Browse all cars
        </Link>
      </div>
    );
  }

  const { dealer, vehicles } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h1 className="text-3xl font-bold mb-2">{dealer.name}</h1>
        <div className="flex flex-wrap gap-4 text-gray-600">
          {dealer.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{dealer.location}</span>
            </div>
          )}
          {dealer.phone && (
            <div className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              <span>{dealer.phone}</span>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-2">Verified dealer on Zim Cars</p>
      </div>

      <h2 className="text-2xl font-bold mb-6">Available Vehicles ({vehicles.length})</h2>

      {vehicles.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-gray-600">No vehicles listed at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <Link
              key={vehicle.id}
              to={`/vehicle/${vehicle.id}`}
              className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
            >
              {vehicle.images?.[0] ? (
                <img
                  src={vehicle.images[0].imageUrl}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                <p className="text-2xl font-bold text-blue-600 mb-2">${vehicle.price?.toLocaleString()}</p>
                {vehicle.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{vehicle.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default DealerPortfolio;
