import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Bell, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface OrderNotification {
    orderId: string;
    items: any[];
    timestamp: Date;
    status: string;
}

export const OrderNotifications: React.FC = () => {
    const [notifications, setNotifications] = useState<OrderNotification[]>([]);
    
    useEffect(() => {
        const socket = io();
        
        socket.on('newOrder', (order: OrderNotification) => {
            setNotifications(prev => [...prev, order]);
            
            // Show toast notification
            toast('New Order Received', {
                description: `Order #${order.orderId} - ${order.items.length} items`,
                action: {
                    label: "View",
                    onClick: () => { /* Navigate to order details */ }
                }
            });
        });
        
        return () => {
            socket.disconnect();
        };
    }, []);
    
    return (
        <div className="fixed bottom-4 right-4 z-50">
            {notifications.map(notification => (
                <div 
                    key={notification.orderId}
                    className="bg-white rounded-lg shadow-lg p-4 mb-2 border border-gray-200"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Bell className="w-5 h-5 text-blue-500 mr-2" />
                            <div>
                                <p className="font-medium">Order #{notification.orderId}</p>
                                <p className="text-sm text-gray-500">
                                    {notification.items.length} items
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="p-1 hover:bg-green-100 rounded">
                                <Check className="w-4 h-4 text-green-500" />
                            </button>
                            <button className="p-1 hover:bg-red-100 rounded">
                                <X className="w-4 h-4 text-red-500" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
