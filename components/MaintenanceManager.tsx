'use client';

import { useState, useEffect } from 'react';
import { useProperties } from '@/lib/hooks/useProperties';
import { useMaintenance } from '@/lib/hooks/useMaintenance';
import { useBookings } from '@/lib/hooks/useBookings';
import { 
  MaintenanceTask, 
  TaskStatus, 
  TaskPriority, 
  CreateMaintenanceTaskData,
  Property
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, CheckCircle, Clock, AlertTriangle, AlertCircle, Trash2, Edit, Plus, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// Form schema for creating/editing maintenance tasks
const taskFormSchema = z.object({
  property_id: z.string().min(1, 'Property is required'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigned_to: z.string().optional(),
  due_date: z.date().optional(),
});

// Form schema for vendor service records
const vendorServiceSchema = z.object({
  vendor_name: z.string().min(1, 'Vendor name is required'),
  service_type: z.string().min(1, 'Service type is required'),
  service_date: z.date(),
  cost: z.number().min(0, 'Cost must be a positive number'),
  notes: z.string().optional(),
});

// Form schema for inspection checklists
const inspectionSchema = z.object({
  property_id: z.string().min(1, 'Property is required'),
  inspection_type: z.enum(['routine', 'pre-booking', 'post-booking', 'maintenance-followup']),
  due_date: z.date(),
});

// Priority badge component
const PriorityBadge = ({ priority }: { priority: TaskPriority }) => {
  const variants = {
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-blue-100 text-blue-800 border-blue-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    urgent: 'bg-red-100 text-red-800 border-red-200',
  };
  
  return (
    <Badge className={variants[priority]}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
};

// Status badge component
const StatusBadge = ({ status }: { status: TaskStatus }) => {
  const variants = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'in_progress': 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  
  const icons = {
    pending: <Clock className="h-3 w-3 mr-1" />,
    'in_progress': <AlertCircle className="h-3 w-3 mr-1" />,
    completed: <CheckCircle className="h-3 w-3 mr-1" />,
    cancelled: <AlertTriangle className="h-3 w-3 mr-1" />,
  };
  
  const labels = {
    pending: 'Pending',
    'in_progress': 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  
  return (
    <Badge className={variants[status]}>
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

// Task card component
const TaskCard = ({ 
  task, 
  onSelect, 
  onDelete, 
  onStatusChange 
}: { 
  task: MaintenanceTask, 
  onSelect: (task: MaintenanceTask) => void,
  onDelete: (id: string) => void,
  onStatusChange: (id: string, status: TaskStatus) => void
}) => {
  const propertyName = task.properties?.title || 'Unknown Property';
  const formattedDueDate = task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'No due date';
  
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{task.title}</CardTitle>
          <div className="flex space-x-1">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
          </div>
        </div>
        <CardDescription>{propertyName}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-gray-600 mb-2">
          {task.description ? task.description.substring(0, 100) + (task.description.length > 100 ? '...' : '') : 'No description'}
        </p>
        <div className="flex justify-between items-center text-sm">
          <span>Due: {formattedDueDate}</span>
          {task.assigned_to && <span>Assigned to: {task.assigned_to}</span>}
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex justify-between">
        <div>
          <Select 
            defaultValue={task.status} 
            onValueChange={(value) => onStatusChange(task.id, value as TaskStatus)}
          >
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => onSelect(task)}>
            <Edit className="h-4 w-4 mr-1" /> Details
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(task.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

// Task detail dialog component
const TaskDetailDialog = ({ 
  task, 
  isOpen, 
  onClose, 
  onUpdate, 
  onAddVendorService,
  properties
}: { 
  task: MaintenanceTask | null, 
  isOpen: boolean, 
  onClose: () => void, 
  onUpdate: (id: string, updates: Partial<MaintenanceTask>) => void,
  onAddVendorService: (taskId: string, serviceData: any) => void,
  properties: Property[]
}) => {
  const [activeTab, setActiveTab] = useState('details');
  
  // Task update form
  const taskForm = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      property_id: task?.property_id || '',
      title: task?.title || '',
      description: task?.description || '',
      priority: task?.priority || 'medium',
      assigned_to: task?.assigned_to || '',
      due_date: task?.due_date ? new Date(task.due_date) : undefined,
    }
  });
  
  // Vendor service form
  const vendorForm = useForm<z.infer<typeof vendorServiceSchema>>({
    resolver: zodResolver(vendorServiceSchema),
    defaultValues: {
      vendor_name: '',
      service_type: '',
      service_date: new Date(),
      cost: 0,
      notes: '',
    }
  });
  
  // Update form values when task changes
  useEffect(() => {
    if (task) {
      taskForm.reset({
        property_id: task.property_id,
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        assigned_to: task.assigned_to || '',
        due_date: task.due_date ? new Date(task.due_date) : undefined,
      });
    }
  }, [task, taskForm]);
  
  // Handle task update
  const onTaskUpdate = (data: z.infer<typeof taskFormSchema>) => {
    if (!task) return;
    
    const updates: Partial<MaintenanceTask> = {
      title: data.title,
      description: data.description,
      priority: data.priority,
      assigned_to: data.assigned_to,
      due_date: data.due_date ? format(data.due_date, 'yyyy-MM-dd') : undefined,
    };
    
    onUpdate(task.id, updates);
  };
  
  // Handle vendor service submission
  const onVendorServiceSubmit = (data: z.infer<typeof vendorServiceSchema>) => {
    if (!task) return;
    
    const serviceData = {
      vendor_name: data.vendor_name,
      service_type: data.service_type,
      service_date: format(data.service_date, 'yyyy-MM-dd'),
      cost: data.cost,
      notes: data.notes,
    };
    
    onAddVendorService(task.id, serviceData);
    vendorForm.reset();
    setActiveTab('details');
  };
  
  if (!task) return null;
  
  const propertyName = properties.find(p => p.id === task.property_id)?.title || 'Unknown Property';
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Maintenance Task Details</DialogTitle>
          <DialogDescription>
            View and manage maintenance task details
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="vendor">Vendor Service</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            <Form {...taskForm}>
              <form onSubmit={taskForm.handleSubmit(onTaskUpdate)} className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <div className="text-sm text-gray-500">
                    Created: {format(new Date(task.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
                
                <FormField
                  control={taskForm.control}
                  name="property_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select
                        disabled
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {propertyName}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={taskForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={taskForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={taskForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={taskForm.control}
                    name="assigned_to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned To</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={taskForm.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit">Update Task</Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="vendor">
            <Form {...vendorForm}>
              <form onSubmit={vendorForm.handleSubmit(onVendorServiceSubmit)} className="space-y-4">
                <FormField
                  control={vendorForm.control}
                  name="vendor_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={vendorForm.control}
                  name="service_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Type</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={vendorForm.control}
                    name="service_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Service Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={vendorForm.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={vendorForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit">Record Service</Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="history">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Task History</h3>
              
              <div className="border rounded-md p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Created</span>
                    <span className="text-sm text-gray-500">{format(new Date(task.created_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                  
                  {task.updated_at && task.updated_at !== task.created_at && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Last Updated</span>
                      <span className="text-sm text-gray-500">{format(new Date(task.updated_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  )}
                  
                  {task.completed_at && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Completed</span>
                      <span className="text-sm text-gray-500">{format(new Date(task.completed_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Created By</span>
                    <span className="text-sm text-gray-500">{task.created_by}</span>
                  </div>
                </div>
              </div>
              
              {task.description && task.description.includes('Vendor:') && (
                <div className="border rounded-md p-4">
                  <h4 className="text-md font-medium mb-2">Vendor Services</h4>
                  <pre className="text-sm whitespace-pre-wrap">{task.description}</pre>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// Create task dialog component
const CreateTaskDialog = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  properties 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSubmit: (data: CreateMaintenanceTaskData) => void,
  properties: Property[]
}) => {
  const form = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      property_id: '',
      title: '',
      description: '',
      priority: 'medium',
      assigned_to: '',
      due_date: undefined,
    }
  });
  
  const handleSubmit = (data: z.infer<typeof taskFormSchema>) => {
    const taskData: CreateMaintenanceTaskData = {
      property_id: data.property_id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      assigned_to: data.assigned_to,
      due_date: data.due_date ? format(data.due_date, 'yyyy-MM-dd') : undefined,
    };
    
    onSubmit(taskData);
    form.reset();
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Maintenance Task</DialogTitle>
          <DialogDescription>
            Add a new maintenance task for your property
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="property_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="submit">Create Task</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// Create inspection dialog component
const CreateInspectionDialog = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  properties 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSubmit: (data: any) => void,
  properties: Property[]
}) => {
  const form = useForm<z.infer<typeof inspectionSchema>>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      property_id: '',
      inspection_type: 'routine',
      due_date: new Date(),
    }
  });
  
  const handleSubmit = (data: z.infer<typeof inspectionSchema>) => {
    onSubmit({
      propertyId: data.property_id,
      dueDate: format(data.due_date, 'yyyy-MM-dd'),
      inspectionType: data.inspection_type
    });
    form.reset();
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Property Inspection</DialogTitle>
          <DialogDescription>
            Create a new property inspection task
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="property_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="inspection_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inspection Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select inspection type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="routine">Routine Inspection</SelectItem>
                      <SelectItem value="pre-booking">Pre-booking Inspection</SelectItem>
                      <SelectItem value="post-booking">Post-booking Inspection</SelectItem>
                      <SelectItem value="maintenance-followup">Maintenance Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Inspection Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="submit">Schedule Inspection</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// Main maintenance manager component
export default function MaintenanceManager({ propertyId }: { propertyId?: string }) {
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInspectionDialogOpen, setIsInspectionDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get properties and maintenance tasks
  const { properties } = useProperties();
  const { 
    tasks, 
    loading, 
    error, 
    fetchTasks, 
    createTask, 
    updateTask, 
    deleteTask, 
    createInspection,
    addVendorService
  } = useMaintenance({
    propertyId,
    autoFetch: true
  });
  
  // Get bookings for cleaning schedule coordination
  const { bookings } = useBookings({ propertyId });
  
  // Filter tasks based on search query and filters
  const filteredTasks = tasks.filter(task => {
    // Apply status filter
    if (filterStatus && task.status !== filterStatus) return false;
    
    // Apply priority filter
    if (filterPriority && task.priority !== filterPriority) return false;
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query)) ||
        (task.assigned_to && task.assigned_to.toLowerCase().includes(query))
      );
    }
    
    return true;
  });
  
  // Handle task selection
  const handleSelectTask = (task: MaintenanceTask) => {
    setSelectedTask(task);
  };
  
  // Handle task deletion
  const handleDeleteTask = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask(id);
    }
  };
  
  // Handle task status change
  const handleStatusChange = async (id: string, status: TaskStatus) => {
    await updateTask(id, { status });
  };
  
  // Handle task creation
  const handleCreateTask = async (data: CreateMaintenanceTaskData) => {
    await createTask(data);
  };
  
  // Handle inspection creation
  const handleCreateInspection = async (data: any) => {
    await createInspection(data.propertyId, data.dueDate, data.inspectionType);
  };
  
  // Handle vendor service recording
  const handleAddVendorService = async (taskId: string, serviceData: any) => {
    await addVendorService(taskId, serviceData);
  };
  
  // Handle filter reset
  const handleResetFilters = () => {
    setFilterStatus('');
    setFilterPriority('');
    setSearchQuery('');
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Maintenance & Operations</h1>
        <div className="flex space-x-2">
          <Button onClick={() => setIsInspectionDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Schedule Inspection
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Task
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="col-span-1 md:col-span-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="col-span-1 flex space-x-2">
          <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as TaskStatus | '')}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterPriority} onValueChange={(value) => setFilterPriority(value as TaskPriority | '')}>
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onSelect={handleSelectTask}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          {loading ? (
            <p>Loading tasks...</p>
          ) : (
            <>
              <h3 className="text-lg font-medium mb-2">No tasks found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || filterStatus || filterPriority ? 
                  'No tasks match your current filters.' : 
                  'You have no maintenance tasks. Create a new task to get started.'}
              </p>
              {(searchQuery || filterStatus || filterPriority) && (
                <Button variant="outline" onClick={handleResetFilters}>
                  Reset Filters
                </Button>
              )}
            </>
          )}
        </div>
      )}
      
      {/* Task detail dialog */}
      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
          onAddVendorService={handleAddVendorService}
          properties={properties}
        />
      )}
      
      {/* Create task dialog */}
      <CreateTaskDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateTask}
        properties={properties}
      />
      
      {/* Create inspection dialog */}
      <CreateInspectionDialog
        isOpen={isInspectionDialogOpen}
        onClose={() => setIsInspectionDialogOpen(false)}
        onSubmit={handleCreateInspection}
        properties={properties}
      />
    </div>
  );
}