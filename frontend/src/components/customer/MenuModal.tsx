import React, { useEffect, useState } from 'react';

interface MenuModalProps {
  show: boolean;
  onHide: () => void;
}

const MenuModal = ({ show, onHide }: MenuModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [grouped, setGrouped] = useState<Record<string, Array<{name: string; description: string; price: number}>>>({});

  useEffect(() => {
    if (!show) return;
    const fetchMenu = async () => {
      setLoading(true);
      setError('');
      try {
        const API_URL = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:5001';
        const res = await fetch(`${API_URL}/api/guest/menu`);
        const data = await res.json();
        if (!data?.success) throw new Error('Failed to load menu');
        const items = (data.menu_items || []) as Array<any>;
        const groupedByCategory: Record<string, Array<{name: string; description: string; price: number}>> = {};
        items.forEach((item: any) => {
          const cat = item.category || 'Menu';
          if (!groupedByCategory[cat]) groupedByCategory[cat] = [];
          groupedByCategory[cat].push({
            name: item.name,
            description: item.description || '',
            price: Number(item.base_price || item.price || 0)
          });
        });
        setGrouped(groupedByCategory);
      } catch (e: any) {
        setError(e?.message || 'Failed to load menu');
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [show]);

  if (!show) return null;

  const categories = Object.keys(grouped);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 overflow-y-auto max-h-[90vh] relative">
        <button
          className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-600"
          onClick={onHide}
        >
          &times;
        </button>
        <div className="p-6">
          <h2 className="text-2xl font-semibold text-[#a87437] mb-4">Menu Preview</h2>
          {loading && (
            <div className="py-8 text-center text-gray-600">Loading menu…</div>
          )}
          {error && (
            <div className="py-8 text-center text-red-600">{error}</div>
          )}
          {!loading && !error && categories.length === 0 && (
            <div className="py-8 text-center text-gray-600">No menu items available.</div>
          )}
          {!loading && !error && categories.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {categories.map((category) => (
                <div key={category} className="mb-4">
                  <h3 className="mb-4 text-xl font-semibold text-[#D4A762]">{category}</h3>
                  <div>
                    {grouped[category].map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start mb-3">
                        <div className="pr-3">
                          <h5 className="mb-1 font-medium">{item.name}</h5>
                          {item.description && (
                            <small className="text-gray-500 block">{item.description}</small>
                          )}
                        </div>
                        <span className="font-bold text-[#D4A762] whitespace-nowrap">₱{(item.price || 0).toFixed(2)}</span>
                      </div>
                    ))}
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

export default MenuModal; 