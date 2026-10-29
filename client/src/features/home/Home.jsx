import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { assetUrl } from '../../utils/assets';
import { Search, MessageCircle, Car, ShieldCheck } from 'lucide-react';

const Home = () => {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchMake, setSearchMake] = useState('');
  const [searchMaxPrice, setSearchMaxPrice] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchFeatured();
  }, []);

  const fetchFeatured = async () => {
    try {
      const res = await api.get('/vehicles/public');
      setFeatured(res.data.slice(0, 4));
    } catch (error) {
      console.error('Error fetching featured vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchMake) params.append('make', searchMake);
    if (searchMaxPrice) params.append('maxPrice', searchMaxPrice);
    navigate(`/cars?${params.toString()}`);
  };

  const getPrimaryImage = (vehicle) => {
    if (vehicle.images && vehicle.images.length > 0) {
      const primary = vehicle.images.find(img => img.isPrimary) || vehicle.images[0];
      return assetUrl(primary.url);
    }
    return null;
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 to-blue-900 text-white animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Find Quality Used Cars in <span className="text-blue-300">Harare</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-200 mb-8">
              Browse verified vehicle listings, enquire directly on WhatsApp and deal with trusted local car dealers.
            </p>
            <form onSubmit={handleSearch} className="bg-white rounded-xl p-4 md:p-6 shadow-lg mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Make (e.g., Toyota)"
                  value={searchMake}
                  onChange={(e) => setSearchMake(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max Price ($)"
                  value={searchMaxPrice}
                  onChange={(e) => setSearchMaxPrice(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 min-h-[44px]">
                  <Search className="w-5 h-5" />
                  Search Cars
                </button>
              </div>
            </form>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/cars"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold text-center transition-colors min-h-[44px] flex items-center justify-center"
              >
                Browse All Cars
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <section className="py-8 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-blue-600">{featured.length}+</p>
              <p className="text-gray-600">Cars Available</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-600">Harare</p>
              <p className="text-gray-600">Trusted Dealers</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-600">USD</p>
              <p className="text-gray-600">Pricing</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="py-6 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <span>Verified dealer</span>
            </div>
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              <span>Duty status shown on every car</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <span>Deals are logged</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-gray-600 text-lg">Simple, fast and traceable</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-gray-100">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">1. Browse</h3>
              <p className="text-gray-600">Find cars with photos, price, specs and duty status.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-gray-100">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">2. Enquire</h3>
              <p className="text-gray-600">Chat on WhatsApp with your enquiry tracked.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-gray-100">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Car className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">3. Buy</h3>
              <p className="text-gray-600">View, negotiate and complete the sale.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Cars */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Featured Vehicles</h2>
              <p className="text-gray-600">Handpicked cars available right now</p>
            </div>
            <Link to="/cars" className="text-blue-600 hover:text-blue-700 font-semibold hidden md:block">
              View all cars →
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">Loading...</div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map((vehicle) => (
                <div key={vehicle.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow border border-gray-100">
                  <div className="h-48 bg-gray-200">
                    {getPrimaryImage(vehicle) ? (
                      <img src={getPrimaryImage(vehicle)} alt={`${vehicle.make} ${vehicle.model}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">No Image</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-1">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h3>
                    <p className="text-2xl font-bold text-blue-600 mb-3">${vehicle.price.toLocaleString()}</p>
                    <p className="text-sm text-gray-500 mb-4">Dealer: {vehicle.dealer.name}</p>
                    <Link
                      to={`/vehicle/${vehicle.id}`}
                      className="block w-full bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-600">No featured vehicles at the moment.</p>
              <Link to="/cars" className="text-blue-600 hover:underline mt-2 inline-block">Browse all cars</Link>
            </div>
          )}

          <div className="text-center mt-8 md:hidden">
            <Link to="/cars" className="text-blue-600 hover:text-blue-700 font-semibold">
              View all cars →
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Buy with Confidence</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-8">
              Every enquiry is tracked, every sale is recorded and commissions are calculated transparently. Dealing through this platform means full accountability.
            </p>
            <Link
              to="/cars"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
            >
              Start Browsing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold mb-2">Zim Cars</h3>
          <p className="text-gray-400 mb-4">Connecting Harare car buyers to trusted dealers</p>
          <p className="text-gray-500 text-xs mb-2">Data use: We only collect details needed to pass your enquiry to the dealer. Leads are logged for attribution.</p>
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Zim Cars. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
