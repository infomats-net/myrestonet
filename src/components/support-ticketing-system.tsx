
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useUser, 
  useFirebase 
} from '@/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  where,
  collectionGroup
} from 'firebase/firestore';
import { 
  LifeBuoy, 
  Plus, 
  Search, 
  MessageSquare, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Send, 
  Paperclip, 
  ChevronRight,
  Filter,
  ShieldCheck,
  Building
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ImageUploader } from '@/components/image-uploader';

interface SupportTicketingSystemProps {
  restaurantId?: string; // Optional: If provided, scope to one restaurant. Otherwise show all (Admin mode).
}

export function SupportTicketingSystem({ restaurantId }: SupportTicketingSystemProps) {
  const { firestore, storage } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [isNewTicketOpen, setIsNewDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const isAdmin = user?.role === 'super_admin';

  // 1. Fetch Tickets
  const ticketsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    
    // If we have a specific restaurantId, query that subcollection
    if (restaurantId) {
      return query(
        collection(firestore, 'restaurants', restaurantId, 'tickets'),
        orderBy('lastReplyAt', 'desc')
      );
    }
    
    // Admin Mode: Use Collection Group to see all tickets platform-wide
    return query(
      collectionGroup(firestore, 'tickets'),
      orderBy('lastReplyAt', 'desc')
    );
  }, [firestore, restaurantId]);

  const { data: tickets, isLoading: loadingTickets } = useCollection(ticketsQuery);

  // 2. Fetch Messages for Selected Ticket
  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedTicket) return null;
    return query(
      collection(firestore, 'restaurants', selectedTicket.restaurantId, 'tickets', selectedTicket.id, 'messages'),
      orderBy('createdAt', 'asc')
    );
  }, [firestore, selectedTicket]);

  const { data: messages, isLoading: loadingMessages } = useCollection(messagesQuery);

  const [newTicketForm, setNewTicketForm] = useState({
    subject: '',
    category: 'Billing',
    priority: 'medium',
    message: ''
  });

  const handleCreateTicket = async () => {
    if (!firestore || !user || !restaurantId || !newTicketForm.subject) return;
    setIsSending(true);
    try {
      const ticketsRef = collection(firestore, 'restaurants', restaurantId, 'tickets');
      const ticketDoc = await addDoc(ticketsRef, {
        subject: newTicketForm.subject,
        category: newTicketForm.category,
        priority: newTicketForm.priority,
        status: 'open',
        restaurantId,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        lastReplyAt: serverTimestamp()
      });

      await addDoc(collection(ticketsRef, ticketDoc.id, 'messages'), {
        senderUid: user.uid,
        senderRole: user.role,
        message: newTicketForm.message,
        createdAt: serverTimestamp()
      });

      setIsNewDialogOpen(false);
      setNewTicketForm({ subject: '', category: 'Billing', priority: 'medium', message: '' });
      toast({ title: "Ticket Opened", description: "A support agent will be with you shortly." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSending(true);
    }
  };

  const handleSendReply = async () => {
    if (!firestore || !user || !selectedTicket || (!replyMessage && !attachmentUrl)) return;
    setIsSending(true);
    try {
      const messagesRef = collection(firestore, 'restaurants', selectedTicket.restaurantId, 'tickets', selectedTicket.id, 'messages');
      await addDoc(messagesRef, {
        senderUid: user.uid,
        senderRole: user.role,
        message: replyMessage,
        attachmentUrl: attachmentUrl || null,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(firestore, 'restaurants', selectedTicket.restaurantId, 'tickets', selectedTicket.id), {
        lastReplyAt: serverTimestamp(),
        status: isAdmin ? 'pending' : 'open' // Admins set to pending (waiting for user), users set to open
      });

      setReplyMessage('');
      setAttachmentUrl('');
      toast({ title: "Reply Sent" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Reply failed" });
    } finally {
      setIsSending(false);
    }
  };

  const updateTicketStatus = async (ticket: any, newStatus: string) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'restaurants', ticket.restaurantId, 'tickets', ticket.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Status Updated", description: `Ticket marked as ${newStatus}` });
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  };

  const filteredTickets = tickets?.filter(t => statusFilter === 'all' || t.status === statusFilter) || [];

  if (isUserLoading || loadingTickets) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-180px)]">
      {/* Sidebar: Ticket List */}
      <Card className="lg:col-span-1 rounded-[2.5rem] border-none shadow-2xl flex flex-col overflow-hidden bg-white">
        <CardHeader className="p-8 border-b bg-slate-50/50 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl text-primary"><LifeBuoy className="h-5 w-5" /></div>
              <CardTitle className="text-xl font-black">Support Center</CardTitle>
            </div>
            {!isAdmin && (
              <Button size="icon" className="rounded-full h-10 w-10 shadow-lg" onClick={() => setIsNewDialogOpen(true)}>
                <Plus className="h-5 w-5" />
              </Button>
            )}
          </div>
          <div className="flex gap-2 bg-white p-1 rounded-xl border shadow-sm">
            {['all', 'open', 'resolved'].map(f => (
              <button 
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  statusFilter === f ? "bg-primary text-white shadow-md" : "text-slate-400 hover:bg-slate-50"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {filteredTickets.map(ticket => (
              <div 
                key={ticket.id} 
                onClick={() => setSelectedTicket(ticket)}
                className={cn(
                  "p-6 cursor-pointer transition-all hover:bg-slate-50 relative group",
                  selectedTicket?.id === ticket.id ? "bg-primary/5 border-l-4 border-l-primary" : ""
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-slate-200">
                    {ticket.category}
                  </Badge>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">
                    {ticket.lastReplyAt ? format(new Date(ticket.lastReplyAt), 'MMM d') : 'New'}
                  </span>
                </div>
                <h4 className="font-black text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">{ticket.subject}</h4>
                <p className="text-xs text-slate-500 line-clamp-1 mt-1">{ticket.message}</p>
                <div className="flex justify-between items-center mt-4">
                  <Badge className={cn(
                    "text-[9px] uppercase font-black px-3 py-0.5 rounded-full border-none",
                    ticket.status === 'open' ? "bg-emerald-100 text-emerald-700" : 
                    ticket.status === 'resolved' ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-700"
                  )}>
                    {ticket.status}
                  </Badge>
                  <div className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-400">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      ticket.priority === 'high' || ticket.priority === 'urgent' ? "bg-rose-500" : 
                      ticket.priority === 'medium' ? "bg-amber-500" : "bg-emerald-500"
                    )} />
                    {ticket.priority}
                  </div>
                </div>
              </div>
            ))}
            {filteredTickets.length === 0 && (
              <div className="p-20 text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 mx-auto text-slate-200" />
                <p className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">No tickets found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Main: Conversation Interface */}
      <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-2xl flex flex-col overflow-hidden bg-white">
        {selectedTicket ? (
          <>
            <CardHeader className="p-8 border-b flex flex-row items-center justify-between bg-slate-50/30">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-slate-900">{selectedTicket.subject}</h2>
                  <Badge variant="outline" className="rounded-full px-3">{selectedTicket.id.slice(-6).toUpperCase()}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                  <User className="h-3 w-3" /> Created by {selectedTicket.createdBy === user?.uid ? 'You' : 'Admin'}
                  <span className="mx-1">•</span>
                  <Building className="h-3 w-3" /> ID: {selectedTicket.restaurantId}
                </div>
              </div>
              <div className="flex gap-2">
                {isAdmin && selectedTicket.status !== 'resolved' && (
                  <Button variant="outline" size="sm" className="rounded-xl font-black text-[10px] uppercase" onClick={() => updateTicketStatus(selectedTicket, 'resolved')}>
                    Mark Resolved
                  </Button>
                )}
                {!isAdmin && selectedTicket.status === 'resolved' && (
                  <Button variant="ghost" size="sm" className="rounded-xl font-black text-[10px] uppercase text-primary" onClick={() => updateTicketStatus(selectedTicket, 'open')}>
                    Reopen
                  </Button>
                )}
              </div>
            </CardHeader>

            <ScrollArea className="flex-1 p-8 bg-slate-50/20">
              <div className="space-y-8">
                {messages?.map((msg, i) => (
                  <div key={msg.id} className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.senderUid === user?.uid ? "ml-auto items-end" : "items-start"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {msg.senderRole === 'super_admin' ? 'DineFlow Support' : 'Restaurant Admin'}
                      </span>
                      <span className="text-[9px] text-slate-300">
                        {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}
                      </span>
                    </div>
                    <div className={cn(
                      "p-5 rounded-3xl text-sm leading-relaxed shadow-sm",
                      msg.senderUid === user?.uid 
                        ? "bg-primary text-white rounded-tr-none" 
                        : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                    )}>
                      {msg.message}
                      {msg.attachmentUrl && (
                        <div className="mt-4 rounded-xl overflow-hidden border border-white/20 shadow-lg">
                          <img src={msg.attachmentUrl} className="max-w-full h-auto cursor-zoom-in" alt="Attachment" onClick={() => window.open(msg.attachmentUrl, '_blank')} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loadingMessages && <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto h-6 w-6 text-primary" /></div>}
              </div>
            </ScrollArea>

            <div className="p-8 border-t bg-white">
              <div className="space-y-4">
                <Textarea 
                  placeholder="Type your reply..." 
                  value={replyMessage}
                  onChange={e => setReplyMessage(e.target.value)}
                  className="rounded-2xl bg-slate-50 border-none resize-none min-h-[100px] p-6 focus:ring-primary/20"
                />
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="rounded-full text-slate-400 hover:text-primary transition-colors"
                      onClick={() => document.getElementById('ticket-attachment')?.click()}
                    >
                      <Paperclip className="h-5 w-5 mr-2" /> 
                      {attachmentUrl ? 'Change Attachment' : 'Add Attachment'}
                    </Button>
                    {attachmentUrl && (
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-none font-bold text-[10px]">
                        Asset Attached <CheckCircle2 className="h-3 w-3 ml-1" />
                      </Badge>
                    )}
                  </div>
                  <Button 
                    className="rounded-2xl h-12 px-10 font-black gap-2 shadow-xl shadow-primary/20" 
                    disabled={isSending || (!replyMessage && !attachmentUrl)}
                    onClick={handleSendReply}
                  >
                    {isSending ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
                    Send Response
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-6">
            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200">
              <MessageSquare className="h-12 w-12" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">Select a Conversation</h3>
              <p className="text-slate-400 max-w-sm mx-auto mt-2">Pick a ticket from the list to view history and respond to support agents.</p>
            </div>
          </div>
        )}
      </Card>

      {/* Hidden Attachment Input */}
      <div className="hidden">
        <ImageUploader 
          path={`support/${selectedTicket?.restaurantId}/${selectedTicket?.id}/attachment-${Date.now()}`}
          onUploadSuccess={(url) => setAttachmentUrl(url)}
          label="Ticket Attachment"
        />
        <input id="ticket-attachment" type="file" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            // Trigger quick upload using existing storage logic
            const storageRef = ref(storage!, `support/${selectedTicket?.restaurantId}/${selectedTicket?.id}/${file.name}`);
            uploadBytes(storageRef, file).then(async (snap) => {
              const url = await getDownloadURL(snap.ref);
              setAttachmentUrl(url);
              toast({ title: "File Uploaded" });
            });
          }
        }} />
      </div>

      {/* New Ticket Dialog */}
      <Dialog open={isNewTicketOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="rounded-[2.5rem] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Open New Support Ticket</DialogTitle>
            <DialogDescription>Our global support team typically responds within 2 hours.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input 
                placeholder="e.g. Issue with Stripe Payouts" 
                value={newTicketForm.subject} 
                onChange={e => setNewTicketForm({...newTicketForm, subject: e.target.value})}
                className="h-12 rounded-xl bg-slate-50 border-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newTicketForm.category} onValueChange={v => setNewTicketForm({...newTicketForm, category: v})}>
                  <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-none"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Billing">Billing & Tiers</SelectItem>
                    <SelectItem value="Menu">Menu Catalog</SelectItem>
                    <SelectItem value="Payments">Payments (Stripe)</SelectItem>
                    <SelectItem value="Technical">Technical Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={newTicketForm.priority} onValueChange={v => setNewTicketForm({...newTicketForm, priority: v})}>
                  <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-none"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Detailed Message</Label>
              <Textarea 
                placeholder="Describe your issue in detail..." 
                value={newTicketForm.message} 
                onChange={e => setNewTicketForm({...newTicketForm, message: e.target.value})}
                className="rounded-xl min-h-[150px] bg-slate-50 border-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20" 
              onClick={handleCreateTicket}
              disabled={isSending || !newTicketForm.subject || !newTicketForm.message}
            >
              {isSending ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
              Submit Support Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
