import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coffee, Plus, Minus, Settings, Trash2, MoreVertical, Search } from "lucide-react";
import UnifiedCustomizeModal from "../customer/UnifiedCustomizeModal";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

interface MenuItem {
	id: number;
	name: string;
	description: string;
	category: string;
	base_price: number;
	is_available: boolean;
	visible_in_pos: boolean;
	allow_customization?: boolean;
	image_url?: string;
}

interface CartItem extends MenuItem {
	cartItemId: string; // Unique identifier for each cart item
	quantity: number;
  notes?: string;
	customizations?: any;
	customPrice?: number;
}

interface CustomerInfo {
	name: string;
	tableNumber?: number;
	orderType: 'dine_in' | 'takeout';
	paymentMethod: 'cash' | 'gcash' | 'paymaya';
}

interface SimplePOSProps {
  hideSidebar?: boolean; // when true, render only menu grid (no customer/cart sidebar)
  sidebarOnly?: boolean; // when true, render only the sidebar (customer info + cart)
  children?: React.ReactNode; // PaymentProcessor component to render under cart
}

export default function SimplePOS({ hideSidebar = false, sidebarOnly = false, children }: SimplePOSProps) {
	const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
	const [cart, setCart] = useState<CartItem[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("All");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
	const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
		name: '',
		tableNumber: undefined,
		orderType: 'dine_in',
		paymentMethod: 'cash'
	});
    const [customizeModalOpen, setCustomizeModalOpen] = useState(false);
    const [selectedItemForCustomization, setSelectedItemForCustomization] = useState<MenuItem | null>(null);
	const [showMoreMenu, setShowMoreMenu] = useState(false);
	const moreMenuRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
		// Initialize Socket.IO connection for real-time updates
		const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
		const newSocket = io(API_URL, {
			transports: ['polling', 'websocket'],
			path: '/socket.io',
			withCredentials: true,
			timeout: 30000,
			forceNew: true,
			autoConnect: true,
			reconnection: true,
			reconnectionAttempts: 5,
			reconnectionDelay: 1000
		});
		setSocket(newSocket);

		// Listen for real-time menu updates
		newSocket.on('menu-updated', (data) => {
			console.log('Menu updated in POS:', data);
			fetchMenuItems();
		});

		newSocket.on('inventory-updated', (data) => {
			console.log('Inventory updated in POS:', data);
			fetchMenuItems();
		});

		// Only fetch menu when we need to render it
		if (!sidebarOnly) {
			fetchMenuItems();
		}

		return () => {
			newSocket.close();
		};
	}, [sidebarOnly]);

  // customization helpers are declared below (single definition)

	// Handle click outside to close more menu
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
				setShowMoreMenu(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Helper functions
	const getTotalPrice = () => {
		return cart.reduce((total, item) => {
			// Ensure we have valid numbers for price calculation
			const customPrice = typeof item.customPrice === 'number' && !isNaN(item.customPrice) ? item.customPrice : null;
			const basePrice = typeof item.base_price === 'number' && !isNaN(item.base_price) ? item.base_price : 0;
			const itemPrice = customPrice || basePrice;
			const quantity = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0;
			
			// Debug logging for troubleshooting
			if (isNaN(itemPrice) || isNaN(quantity)) {
				console.warn('Invalid price or quantity for item:', {
					id: item.id,
					name: item.name,
					customPrice: item.customPrice,
					base_price: item.base_price,
					quantity: item.quantity,
					calculatedPrice: itemPrice,
					calculatedQuantity: quantity
				});
			}
			
			return total + (itemPrice * quantity);
		}, 0);
	};

	const clearCart = () => {
		setCart([]);
	};

	const processOrder = async () => {
		if (cart.length === 0 || !customerInfo.name.trim()) {
			alert('Please add items to cart and enter customer name');
			return;
		}

		// Validate table number for dine-in orders
		if (customerInfo.orderType === 'dine_in' && (!customerInfo.tableNumber || customerInfo.tableNumber < 1 || customerInfo.tableNumber > 6)) {
			alert('Please enter a valid table number (1-6) for dine-in orders');
			return;
		}

		// Calculate total and validate
		const totalAmount = getTotalPrice();
		console.log('Processing order...', { cart, customerInfo, total: totalAmount });

		// Validate total amount
		if (isNaN(totalAmount) || totalAmount <= 0) {
			alert('Invalid total amount. Please check your cart items.');
			console.error('Invalid total amount:', totalAmount, 'Cart items:', cart);
			return;
		}

		try {
			const orderData = {
				customer_info: customerInfo,
				items: cart.map(item => ({
					menu_item_id: item.id,
					quantity: item.quantity,
					notes: item.notes,
					customizations: item.customizations,
					custom_price: item.customPrice
				})),
				total_amount: totalAmount,
				order_type: customerInfo.orderType,
				payment_method: customerInfo.paymentMethod
			};

			console.log('Sending order data:', orderData);

			const response = await fetch('/api/orders', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify(orderData),
			});

            const result = await response.json();

            if (result.success) {
                const newOrderId = result?.order?.orderId || result?.orderId || 'unknown';
                alert(`Order placed successfully! Order ID: ${newOrderId}`);
				clearCart();
				setCustomerInfo({
					name: '',
					tableNumber: undefined,
					orderType: 'dine_in',
					paymentMethod: 'cash'
				});
			} else {
				alert(`Failed to place order: ${result.message}`);
			}
		} catch (error) {
			console.error('Error placing order:', error);
			alert('Failed to place order. Please try again.');
		}
	};

  // When only the sidebar is requested, render it directly
  if (sidebarOnly) {
    return (
      <div className="w-full bg-gray-50 p-4 sm:p-6 self-start">
        {/* Customer Information */}
        <Card className="mb-4 bg-white border shadow-lg">
          <CardHeader>
            <CardTitle className="text-base text-[#3f3532]">Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-[#6B5B5B] mb-1 block">Customer Name *</label>
                <Input
                  placeholder="Enter customer name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                  className="h-9 bg-white border focus:border-[#a87437]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Order Type *</label>
						<div className="flex flex-wrap gap-3 sm:gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="dine_in"
                      checked={customerInfo.orderType === 'dine_in'}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, orderType: e.target.value as 'dine_in' | 'takeout' }))}
                      className="w-4 h-4 text-amber-600"
                    />
                    <span className="text-sm text-gray-700">Dine In</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="takeout"
                      checked={customerInfo.orderType === 'takeout'}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, orderType: e.target.value as 'dine_in' | 'takeout' }))}
                      className="w-4 h-4 text-amber-600"
                    />
                    <span className="text-sm text-gray-700">Take Out</span>
                  </label>
                </div>
              </div>
              {customerInfo.orderType === 'dine_in' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Table Number *</label>
                  <Input
                    placeholder="Enter table number (1-6)"
                    type="number"
                    min="1"
                    max="6"
                    value={customerInfo.tableNumber || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const num = parseInt(value);
                      if (value === '' || (num >= 1 && num <= 6)) {
                        setCustomerInfo(prev => ({ ...prev, tableNumber: value ? Number(value) : undefined }));
                      }
                    }}
                    className="h-9"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cart Panel */}
					{/* eslint-disable-next-line react/forbid-dom-props */}
					<div className="bg-white border shadow-lg lg:overflow-hidden p-0 m-0 h-48 relative">
          {/* eslint-disable-next-line react/forbid-dom-props */}
          <div className="flex-shrink-0 pr-3 pl-0 py-1 -my-1 -mt-2 p-0 m-0">
            {/* eslint-disable-next-line react/forbid-dom-props */}
            <div className="flex items-center gap-2 text-[#3f3532] -ml-2 text-sm font-medium p-0 m-0 leading-tight">
              <img src="/images/shopping-cart.png" alt="Cart" className="w-4 h-4 object-contain invert" />
              Cart ({cart.length})
            </div>
          </div>
						{/* eslint-disable-next-line react/forbid-dom-props */}
						<div className="px-2 pb-12 pt-0 m-0 h-36 overflow-y-auto">
							<div className="pr-2 pb-0 h-auto max-h-none">
              {cart.length === 0 ? (
                <div className="text-center text-[#6B5B5B] py-0 leading-none">
                  <Coffee className="w-3 h-3 mx-auto mb-0 text-[#a87437]/30" />
                  <p className="text-[10px] leading-none my-0.5">Empty</p>
                </div>
              ) : (
                <div className="space-y-1 pb-0">
                  {cart.map((item) => (
                    <div key={item.cartItemId} className="p-2 bg-white rounded border space-y-0 w-full leading-none">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex-1 min-w-0 mr-2">
                          <h4 className="font-medium text-sm truncate leading-tight my-0.5">{item.name}</h4>
                          <div className="flex items-center gap-2 mt-0">
                            {item.customPrice && item.customPrice !== item.base_price ? (
                              <>
                                <span className="text-sm text-gray-500 line-through leading-tight">₱{item.base_price}</span>
                                <span className="text-sm text-blue-600 font-medium leading-tight">₱{item.customPrice}</span>
                              </>
                            ) : (
                              <span className="text-sm text-gray-600 leading-tight">₱{item.base_price}</span>
                            )}
                            {item.customizations && (
                              <Badge variant="secondary" className="text-[10px] leading-none px-0.5 py-0.5">Customized</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <Button size="sm" variant="outline" onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="h-5 w-5 p-0 min-h-5 min-w-5">
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-5 text-center text-xs font-medium leading-none">{item.quantity}</span>
                          <Button size="sm" variant="outline" onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="h-5 w-5 p-0 min-h-5 min-w-5">
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {item.notes && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-0.5 rounded leading-none">
                          <strong>Notes:</strong> {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            {/* eslint-disable-next-line react/forbid-dom-props */}
            <div className="border-t pt-0 space-y-0 pb-0 absolute bottom-0 left-0 right-0 h-fit">
              {/* eslint-disable-next-line react/forbid-dom-props */}
              <div className="bg-blue-50 p-2 rounded mb-0 leading-tight">
                <div className="flex justify-between text-sm font-semibold text-blue-900 leading-tight m-0">
                  <span>Total:</span>
                  <span>₱{getTotalPrice().toFixed(2)}</span>
                </div>
                <p className="text-xs text-blue-600 mt-0 leading-tight m-0">
                  {cart.length} item{cart.length !== 1 ? 's' : ''} in cart
                </p>
              </div>
						{/* eslint-disable-next-line react/forbid-dom-props */}
						<div className="flex gap-1 flex-col sm:flex-row mt-0 mb-0 p-2 absolute bottom-0 left-0 right-0 h-auto -mt-2 pb-2">
							<Button onClick={clearCart} variant="outline" className="h-6 border-[#a87437] text-[#6B5B5B] hover:bg-[#a87437]/10 w-full sm:flex-1 text-xs min-h-6 leading-tight" disabled={cart.length === 0}>
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </Button>
							<Button onClick={processOrder} disabled={cart.length === 0 || !customerInfo.name.trim() || (customerInfo.orderType === 'dine_in' && (!customerInfo.tableNumber || customerInfo.tableNumber < 1 || customerInfo.tableNumber > 6))} className="h-6 bg-[#a87437] hover:bg-[#a87437]/90 text-white w-full sm:flex-1 text-xs min-h-6 leading-tight">
                  Process
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Processor - rendered under cart */}
        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>
    );
  }

	const fetchMenuItems = async () => {
		try {
			setLoading(true);
			setError(null);
			
			// Fetch menu items that are visible in POS
			const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
			const response = await fetch(`${API_URL}/api/menu/pos`);
			const data = await response.json();
			
			if (data.success && data.menu_items) {
				// Ensure proper type conversion for numeric fields
				const processedItems = data.menu_items.map((item: any) => ({
					...item,
					base_price: Number(item.base_price),
					is_available: Boolean(item.is_available),
					visible_in_pos: Boolean(item.visible_in_pos)
				}));
				setMenuItems(processedItems);
			} else {
				setError('Failed to load menu items');
			}
		} catch (error) {
			console.error('Error fetching menu items:', error);
			setError('Failed to load menu items. Please try again later.');
		} finally {
			setLoading(false);
		}
	};

	// Get unique categories
	const categories = ["All", ...Array.from(new Set(menuItems.map(item => item.category)))];

	// Filter and sort menu items based on search and category
	const filteredItems = menuItems
		.filter(item => {
			const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
								item.description.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
			return matchesSearch && matchesCategory;
		})
		.sort((a, b) => {
			// First sort by category alphabetically
			const categoryComparison = a.category.localeCompare(b.category);
			if (categoryComparison !== 0) {
				return categoryComparison;
			}
			// Then sort by name alphabetically within each category
			return a.name.localeCompare(b.name);
		});

	const addToCart = (item: MenuItem | any, quantity: number = 1) => {
		// Check if this is a customized item (has customizations or customPrice)
		const isCustomized = item.customizations || (item.customPrice && item.customPrice !== item.base_price);
		
		// For customized items, we need to check if there's an exact match
		if (isCustomized) {
			const existingItem = cart.find(cartItem => 
				cartItem.id === item.id && 
				JSON.stringify(cartItem.customizations) === JSON.stringify(item.customizations) &&
				cartItem.customPrice === item.customPrice
			);

			if (existingItem) {
				setCart(prev => prev.map(cartItem =>
					cartItem.cartItemId === existingItem.cartItemId
						? { ...cartItem, quantity: cartItem.quantity + quantity }
						: cartItem
				));
			} else {
				// Ensure customPrice is a valid number
				const customPrice = typeof item.customPrice === 'number' && !isNaN(item.customPrice) 
					? item.customPrice 
					: (typeof item.base_price === 'number' && !isNaN(item.base_price) ? item.base_price : 0);
				
				const newCartItem: CartItem = {
					...item,
					cartItemId: `${item.id}-custom-${Date.now()}-${Math.random()}`,
					quantity,
					customizations: item.customizations || null,
					customPrice: customPrice
				};
				setCart(prev => [...prev, newCartItem]);
			}
			toast.success(`${item.name} added to cart`, { position: 'top-center' });
		} else {
			// For regular items, check if there's a non-customized version
			const existingItem = cart.find(cartItem => 
				cartItem.id === item.id && 
				!cartItem.customizations && 
				cartItem.customPrice === item.base_price
			);

			if (existingItem) {
				setCart(prev => prev.map(cartItem =>
					cartItem.cartItemId === existingItem.cartItemId
						? { ...cartItem, quantity: cartItem.quantity + quantity }
						: cartItem
				));
			} else {
				// Ensure base_price is a valid number
				const basePrice = typeof item.base_price === 'number' && !isNaN(item.base_price) ? item.base_price : 0;
				
				const newCartItem: CartItem = {
					...item,
					cartItemId: `${item.id}-${Date.now()}-${Math.random()}`,
					quantity,
					customizations: null,
					customPrice: basePrice
				};
				setCart(prev => [...prev, newCartItem]);
			}
			toast.success(`${item.name} added to cart`, { position: 'top-center' });
		}
	};

	const removeFromCart = (cartItemId: string) => {
		setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
	};

	const updateQuantity = (cartItemId: string, newQuantity: number) => {
		if (newQuantity <= 0) {
			removeFromCart(cartItemId);
		} else {
			setCart(prev => prev.map(item =>
				item.cartItemId === cartItemId ? { ...item, quantity: newQuantity } : item
			));
		}
	};


    const openCustomizeModal = (item: MenuItem) => {
        setSelectedItemForCustomization(item);
        setCustomizeModalOpen(true);
    };

    const closeCustomizeModal = () => {
        setCustomizeModalOpen(false);
        setSelectedItemForCustomization(null);
    };

    const handleCustomizedItem = (customizedItem: any) => {
        // Add the customized item to cart
        addToCart(customizedItem, 1);
        closeCustomizeModal();
        toast.success(`${customizedItem.name} customized and added to cart!`, { position: 'top-center' });
    };


	if (loading) {
    return (
        <div className={`flex items-center justify-center ${hideSidebar ? 'h-64' : 'h-screen'}`}>
				<div className="text-center">
					<Coffee className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-pulse" />
					<p className="text-lg font-medium text-gray-700">Loading menu...</p>
				</div>
			</div>
		);
	}

	if (error) {
    return (
        <div className={`flex items-center justify-center ${hideSidebar ? 'h-64' : 'h-screen'}`}>
				<div className="text-center">
					<Coffee className="w-12 h-12 mx-auto mb-4 text-red-600" />
					<p className="text-lg font-medium text-red-700 mb-2">Error loading menu</p>
					<p className="text-gray-600 mb-4">{error}</p>
					<Button onClick={fetchMenuItems} variant="outline">
						Try Again
					</Button>
				</div>
			</div>
		);
	}

		return (
			<div className={`flex flex-col lg:flex-row ${hideSidebar ? '' : 'lg:h-screen'}`}>
				{/* Left Side - Menu */}
					<div className={`${hideSidebar ? 'w-full' : 'flex-[1_1_auto]'} p-4 sm:p-6 ${hideSidebar ? '' : 'lg:overflow-auto'}`}>
				<div className="w-full">
					{/* Header */}
					<div className="mb-6">
					</div>

					{/* Search and Category Filter */}
					<div className="flex flex-col sm:flex-row gap-4 mb-6">
						<div className="flex-1 relative">
							<Input
								placeholder="Search menu items..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="h-10 bg-white border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437] pr-10"
							/>
							<Button
								onClick={() => {
									// Search functionality is already handled by the filtered items
									console.log('Searching for:', searchTerm);
								}}
								variant="ghost"
								size="sm"
								className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-[#a87437]/10"
							>
								<Search className="h-4 w-4 text-[#a87437]" />
							</Button>
						</div>
						<div className="flex gap-2 items-center">
							{/* Category Dropdown */}
							<Select value={selectedCategory} onValueChange={setSelectedCategory}>
								<SelectTrigger className="w-48 h-10 border-[#a87437] text-[#6B5B5B] focus:border-[#8f652f] focus:ring-[#a87437] pr-4">
									<SelectValue placeholder="Select category" />
								</SelectTrigger>
								<SelectContent>
									{categories.map((category) => (
										<SelectItem key={category} value={category}>
											{category}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{/* 3-dot Menu Button */}
							<div className="relative" ref={moreMenuRef}>
								<Button
									variant="outline"
									onClick={() => setShowMoreMenu(!showMoreMenu)}
									className="h-10 border-[#a87437] text-[#6B5B5B] hover:bg-[#a87437]/10"
								>
									<MoreVertical className="w-4 h-4" />
								</Button>
								
								{/* Dropdown Menu */}
								{showMoreMenu && (
									<div className="absolute right-0 top-11 z-50 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
										<div className="py-1">
											<button
												onClick={() => {
													setViewMode("grid");
													setShowMoreMenu(false);
												}}
												className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${
													viewMode === "grid" ? "text-[#a87437] font-medium" : "text-gray-700"
												}`}
											>
												<span>Grid View</span>
												{viewMode === "grid" && <span className="text-[#a87437]">✓</span>}
											</button>
											<button
												onClick={() => {
													setViewMode("list");
													setShowMoreMenu(false);
												}}
												className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${
													viewMode === "list" ? "text-[#a87437] font-medium" : "text-gray-700"
												}`}
											>
												<span>List View</span>
												{viewMode === "list" && <span className="text-[#a87437]">✓</span>}
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Menu Items */}
					<div className="w-full">
						{viewMode === "grid" && (
							<div className="space-y-6">
								{(() => {
									// Group items by category
									const groupedItems = filteredItems.reduce((groups, item) => {
										const category = item.category;
										if (!groups[category]) {
											groups[category] = [];
										}
										groups[category].push(item);
										return groups;
									}, {} as Record<string, typeof filteredItems>);

									// Sort categories alphabetically
									const sortedCategories = Object.keys(groupedItems).sort();

									return sortedCategories.map((category) => (
										<div key={category} className="space-y-3">
											{/* Category Header */}
											<div className="space-y-2">
												<h3 className="text-lg font-bold text-[#a87437]">{category}</h3>
												<div className="h-px bg-[#a87437]/30"></div>
											</div>
											
											{/* Items Grid */}
											<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-2 sm:gap-3">
												{groupedItems[category].map((item) => (
													<Card
														key={item.id}
														className="relative hover:shadow-lg transition-all duration-300 border shadow-md bg-white hover:border-[#a87437] h-full"
													>
														<CardContent className="p-2 sm:p-3 flex flex-col h-full min-h-[140px] sm:min-h-[160px]">
															{/* Image */}
															<div className="h-16 w-16 sm:h-20 sm:w-20 mx-auto mb-2 flex items-center justify-center overflow-hidden rounded-lg bg-gray-100 flex-shrink-0">
																{item.image_url ? (
																	<img
																		src={(() => {
																			const path = (item.image_url || '').trim();
																			if (!path) return '';
																			if (/^https?:\/\//i.test(path)) return path;
																			const withSlash = path.startsWith('/') ? path : `/${path}`;
																			return withSlash;
																		})()}
																		alt={item.name}
																		className="w-full h-full object-contain p-1"
																		onError={(e) => {
																			e.currentTarget.style.display = 'none';
																			e.currentTarget.nextElementSibling?.classList.remove('hidden');
																		}}
																	/>
																) : (
																	<div className="w-full h-full flex items-center justify-center">
																		<Coffee className="h-6 w-6 sm:h-8 sm:w-8 text-[#a87437]" />
																	</div>
																)}
															</div>
															
															{/* Content */}
															<div className="flex-1 flex flex-col text-center">
																<h3 className="text-xs sm:text-sm font-semibold text-[#3f3532] mb-1 line-clamp-2 leading-tight">{item.name}</h3>
																<p className="text-xs text-gray-600 mb-2 line-clamp-2 leading-tight hidden sm:block">{item.description}</p>
																<span className="text-sm sm:text-base font-semibold text-amber-700 mb-2">₱{Number(item.base_price).toFixed(2)}</span>
															</div>

															{/* Actions */}
															<div className="flex flex-col gap-1">
																{item.allow_customization && (
																	<Button
																	size="sm"
																	variant="outline"
																	onClick={() => openCustomizeModal(item)}
																	disabled={false}
																	className="text-xs border-[#a87437] text-[#6B5B5B] hover:bg-[#a87437]/10 h-7"
																	title="Customize Item"
																>
																	<Settings className="w-3 h-3 mr-1" />
																	<span className="hidden sm:inline">Customize</span>
																</Button>
																)}
																<Button
																	size="sm"
																	variant="default"
																	onClick={() => addToCart(item, 1)}
																	disabled={false}
																	className="text-xs bg-[#a87437] hover:bg-[#a87437]/90 text-white h-7"
																>
																	Add to Cart
																</Button>
															</div>
														</CardContent>
													</Card>
												))}
											</div>
										</div>
									));
								})()}
							</div>
						)}

						{viewMode === "list" && (
							<div className="space-y-6">
								{(() => {
									// Group items by category
									const groupedItems = filteredItems.reduce((groups, item) => {
										const category = item.category;
										if (!groups[category]) {
											groups[category] = [];
										}
										groups[category].push(item);
										return groups;
									}, {} as Record<string, typeof filteredItems>);

									// Sort categories alphabetically
									const sortedCategories = Object.keys(groupedItems).sort();

									return sortedCategories.map((category) => (
										<div key={category} className="space-y-3">
											{/* Category Header */}
											<div className="space-y-2">
												<h3 className="text-lg font-bold text-[#a87437]">{category}</h3>
												<div className="h-px bg-[#a87437]/30"></div>
											</div>
											
											{/* Items List */}
											<div className="space-y-2">
												{groupedItems[category].map((item) => (
													<Card
														key={item.id}
														className="hover:shadow-lg transition-all duration-300 border shadow-md bg-white hover:border-[#a87437]"
													>
														<CardContent className="p-3">
															<div className="flex gap-3">
																{/* Image */}
																<div className="h-16 w-16 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-lg bg-gray-100">
																	{item.image_url ? (
																		<img
																			src={(() => {
																				const path = (item.image_url || '').trim();
																				if (!path) return '';
																				if (/^https?:\/\//i.test(path)) return path;
																				const withSlash = path.startsWith('/') ? path : `/${path}`;
																				return withSlash;
																			})()}
																			alt={item.name}
																			className="w-full h-full object-contain p-1"
																			onError={(e) => {
																				e.currentTarget.style.display = 'none';
																				e.currentTarget.nextElementSibling?.classList.remove('hidden');
																			}}
																		/>
																	) : null}
																	<div className={`w-full h-full bg-gray-100 flex items-center justify-center ${item.image_url ? 'hidden' : ''}`}>
																		<Coffee className="h-6 w-6 text-[#a87437]" />
																	</div>
																</div>
																
																{/* Content */}
																<div className="flex-1 min-w-0">
																	<div className="flex items-start justify-between">
																		<div className="flex-1 min-w-0">
																			<h3 className="text-sm sm:text-base font-semibold text-[#3f3532] mb-1 line-clamp-1">{item.name}</h3>
																			<p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-2">{item.description}</p>
																			<div className="flex items-center gap-2">
																				<span className="text-sm sm:text-base font-semibold text-amber-700">
																					₱{Number(item.base_price).toFixed(2)}
																				</span>
																			</div>
																		</div>
																		
																		{/* Actions */}
																		<div className="ml-3 flex items-center gap-2">
																			{item.allow_customization && (
																				<Button size="sm" variant="outline" onClick={() => openCustomizeModal(item)} disabled={!item.is_available} className="text-xs border-[#a87437] text-[#6B5B5B] hover:bg-[#a87437]/10 h-8" title="Customize Item">
																					<Settings className="w-3 h-3 mr-1" />
																					<span className="hidden sm:inline">Customize</span>
																				</Button>
																			)}
																			<Button size="sm" variant="default" onClick={() => addToCart(item, 1)} disabled={!item.is_available} className="text-xs bg-[#a87437] hover:bg-[#a87437]/90 text-white h-8">
																				Add to Cart
																			</Button>
																		</div>
																	</div>
																</div>
															</div>
														</CardContent>
													</Card>
												))}
											</div>
										</div>
									));
								})()}
							</div>
						)}

					</div>
				</div>
			</div>

				{/* Right Side - Cart & Payment (hidden when hideSidebar) */}
				{!hideSidebar && (
					<div className="w-full lg:w-[30rem] xl:w-[32rem] 2xl:w-[36rem] min-w-0 p-2 sm:p-3 lg:p-4 flex-shrink-0 lg:sticky lg:top-0 lg:overflow-hidden">
				{/* Customer Information */}
				<Card className="mb-2 bg-white border shadow-lg">
					<CardHeader className="pt-0 pb-0 px-3 -mt-3">
						<CardTitle className="text-sm text-[#3f3532] -mb-4">Customer Information</CardTitle>
					</CardHeader>
					<CardContent className="px-3 pb-0 pt-0 -mb-2">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
							{/* Left: Name + Order Type */}
							<div className="space-y-0">
								<div>
									<label className="text-xs font-medium text-[#6B5B5B] mb-0 block">Customer Name *</label>
									<Input
										placeholder="Enter customer name"
										value={customerInfo.name}
										onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
										className="h-6 text-xs bg-white border focus:border-[#a87437]"
									/>
								</div>
								<div className="mt-2">
									<label className="text-xs font-medium text-gray-700 mb-0 block">Order Type *</label>
									<div className="flex gap-3 ml-0">
									<label className="flex items-center space-x-1">
										<input
											type="radio"
											value="dine_in"
											checked={customerInfo.orderType === 'dine_in'}
											onChange={(e) => setCustomerInfo(prev => ({ ...prev, orderType: e.target.value as 'dine_in' | 'takeout' }))}
											className="w-3 h-3 text-amber-600"
										/>
										<span className="text-xs text-gray-700">Dine In</span>
									</label>
									<label className="flex items-center space-x-1">
										<input
											type="radio"
											value="takeout"
											checked={customerInfo.orderType === 'takeout'}
											onChange={(e) => setCustomerInfo(prev => ({ ...prev, orderType: e.target.value as 'dine_in' | 'takeout' }))}
											className="w-3 h-3 text-amber-600"
										/>
										<span className="text-xs text-gray-700">Take Out</span>
									</label>
								</div>
							</div>
						</div>
						{/* Right: Table Number */}
							<div className="space-y-0">
								{customerInfo.orderType === 'dine_in' && (
									<div>
										<label className="text-xs font-medium text-gray-700 mb-0 block">Table Number *</label>
										<div className="grid grid-cols-3 gap-2">
											{[1,2,3,4,5,6].map((num) => (
												<Button
													key={num}
													variant={customerInfo.tableNumber === num ? 'default' : 'outline'}
													onClick={() => setCustomerInfo(prev => ({ ...prev, tableNumber: num }))}
													className="h-7 text-sm px-2"
													type="button"
												>
													{num}
												</Button>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="flex-1 flex flex-col bg-white border shadow-lg min-h-0">
					<CardHeader className="flex-shrink-0 !py-0 px-2">
            <CardTitle className="flex items-center gap-1 text-[#3f3532] text-xs !m-0">
              <img src="/images/shopping-cart.png" alt="Cart" className="w-3 h-3 object-contain invert" />
							Cart ({cart.length})
						</CardTitle>
					</CardHeader>
				<CardContent className="flex-1 min-h-0 overflow-hidden" style={{ height: '250px' }}>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-2 h-full">
						{/* Left: Cart Items */}
						<div className="flex flex-col min-h-0 pt-0">
							<div className="flex-1 overflow-y-auto mb-1 max-h-[200px]">
							{cart.length === 0 ? (
								<div className="text-center text-[#6B5B5B] py-12">
									<Coffee className="w-12 h-12 mx-auto mb-3 text-[#a87437]/30" />
									<p className="text-sm">Cart is empty</p>
									<p className="text-xs text-[#6B5B5B]/60">Add items to get started</p>
								</div>
							) : (
								<div className="space-y-3">
									{cart.map((item) => (
										<div key={item.cartItemId} className="p-4 bg-white rounded-lg border space-y-3">
											<div className="flex items-center justify-between">
												<div className="flex-1">
													<h4 className="font-medium text-sm">{item.name}</h4>
																								<div className="flex items-center gap-2 mt-1">
												{item.customPrice && item.customPrice !== item.base_price ? (
													<>
														<span className="text-sm text-gray-500 line-through">₱{item.base_price}</span>
														<span className="text-sm text-blue-600 font-medium">₱{item.customPrice}</span>
													</>
												) : (
													<span className="text-sm text-gray-600">₱{item.base_price}</span>
												)}
												{item.customizations && (
													<Badge variant="secondary" className="text-xs">Customized</Badge>
												)}
											</div>
											{/* Display customization details */}
											{item.customizations && (
												<div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
													<div className="font-medium mb-1">Customizations:</div>
													{Object.entries(item.customizations).map(([key, value]) => (
														<div key={key} className="flex justify-between">
															<span className="capitalize">{key}:</span>
															<span className="font-medium">{String(value)}</span>
														</div>
													))}
												</div>
											)}
												</div>
												<div className="flex items-center gap-2">
													<Button
														size="sm"
														variant="outline"
														onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
														className="h-8 w-8 p-0"
													>
														<Minus className="w-3 h-3" />
													</Button>
													<span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
													<Button
														size="sm"
														variant="outline"
														onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
														className="h-8 w-8 p-0"
													>
														<Plus className="w-3 h-3" />
													</Button>
												</div>
											</div>
											{item.notes && (
												<div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
													<strong>Notes:</strong> {item.notes}
												</div>
											)}
										</div>
									))}
								</div>
							)}
						</div>
						</div>

						{/* Right: Payment and Summary */}
					<div className="flex flex-col justify-between lg:pl-4 lg:border-l lg:border-gray-200 min-w-0 pt-0">
						<div className="space-y-0.5">
                            {/* Payment Method Selection */}
								<div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">Payment Method</label>
                            <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setCustomerInfo(prev => ({ ...prev, paymentMethod: 'cash' }))}
                                        className={`p-1 rounded-md border transition-all ${
                                            customerInfo.paymentMethod === 'cash'
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="text-center leading-tight">
                                            <div className="text-sm mb-1">💵</div>
                                            <div className="text-xs font-medium">Cash</div>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCustomerInfo(prev => ({ ...prev, paymentMethod: 'gcash' }))}
                                        className={`p-1 rounded-md border transition-all ${
                                            customerInfo.paymentMethod === 'gcash'
                                                ? 'border-green-500 bg-green-50 text-green-700'
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="text-center leading-tight">
                                            <div className="text-sm mb-1">📱</div>
                                            <div className="text-xs font-medium">GCash</div>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCustomerInfo(prev => ({ ...prev, paymentMethod: 'paymaya' }))}
                                        className={`p-1 rounded-md border transition-all ${
                                            customerInfo.paymentMethod === 'paymaya'
                                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="text-center leading-tight">
                                            <div className="text-sm mb-1">💳</div>
                                            <div className="text-xs font-medium">PayMaya</div>
                                        </div>
                                    </button>
								</div>
							</div>

							{/* Total Amount Display */}
							<div className="bg-blue-50 p-2 rounded-lg">
                                <div className="mt-1 pt-1 border-b border-blue-200">
                                    <p className="text-sm text-blue-700">
                                        Payment: <span className="font-medium capitalize">{customerInfo.paymentMethod}</span>
                                    </p>
                                </div>
                                <p className="text-sm text-blue-600 mt-1">
                                    {cart.length} item{cart.length !== 1 ? 's' : ''} in cart
                                </p>
                                <div className="flex justify-between text-base font-semibold text-blue-900">
                                    <span>Total Amount:</span>
                                    <span>₱{getTotalPrice().toFixed(2)}</span>
                                </div>
                            </div>

						{/* Action Buttons - Always Visible */}
						<div className="flex gap-2 mt-1 w-full">
							<Button onClick={clearCart} variant="outline" className="h-8 flex-1 min-w-0 border-[#a87437] text-[#6B5B5B] hover:bg-[#a87437]/10 inline-flex items-center justify-center whitespace-nowrap text-xs font-medium px-2" disabled={cart.length === 0}>
								<Trash2 className="w-3 h-3 mr-1" />
								Clear Cart
                                </Button>
							<Button onClick={processOrder} disabled={cart.length === 0 || !customerInfo.name.trim() || (customerInfo.orderType === 'dine_in' && (!customerInfo.tableNumber || customerInfo.tableNumber < 1 || customerInfo.tableNumber > 6))} className="h-8 flex-1 min-w-0 bg-[#a87437] hover:bg-[#a87437]/90 text-white inline-flex items-center justify-center whitespace-nowrap text-xs font-medium px-2">
								Process Order
                                </Button>
                            </div>
							</div>
						</div>

						{/* Debug Info removed */}
                        </div>
                  </CardContent>
                </Card>

				{/* Payment Processor - rendered under cart */}
				{children && (
					<div className="mt-4 flex-1 min-h-0 overflow-y-auto">
						{children}
					</div>
				)}
			</div>
			)}

			{/* Customization Modal */}
			{customizeModalOpen && selectedItemForCustomization && (
				<UnifiedCustomizeModal
					item={selectedItemForCustomization}
					onClose={closeCustomizeModal}
					onAdd={handleCustomizedItem}
				/>
			)}
		</div>
	);
} 