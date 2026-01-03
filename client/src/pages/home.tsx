import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  User, Phone, MapPin, Stethoscope, FileText, Scissors, 
  HeartPulse, Dumbbell, Activity, Plus, List, Save, 
  RotateCcw, Calculator, Wallet, Check, Utensils, RefreshCw, CloudUpload,
  Calendar, Clock, X, Pencil, Trash2, CreditCard
} from "lucide-react";

import { Header } from "@/components/header";
import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { setCachedPatients, updateCachedPatient, getCachedPatients, removeCachedPatient } from "@/lib/localStorage";
import type { Patient, InsertPatient, Payment } from "@shared/schema";

const formSchema = z.object({
  patientName: z.string().min(1, "اسم المريض مطلوب"),
  age: z.coerce.number().min(0, "العمر يجب أن يكون رقم موجب").max(150),
  residence: z.string().min(1, "السكن مطلوب"),
  phone: z.string().min(1, "رقم الهاتف مطلوب"),
  doctorName: z.string().min(1, "اسم الطبيب مطلوب"),
  diagnosis: z.string(),
  doctorRequest: z.string(),
  hasSurgery: z.boolean(),
  surgeryType: z.string().optional(),
  needsMedicalCare: z.boolean(),
  careType: z.enum(["homeExercises", "sessions", "none"]).optional(),
  sessionType: z.enum(["equipment", "exercises"]).optional(),
  sessionCount: z.coerce.number().min(0).optional(),
  sessionPrice: z.coerce.number().min(0).optional(),
  needsMedicalAids: z.boolean(),
  aidType: z.string().optional(),
  aidPrice: z.coerce.number().min(0).optional(),
  hasDiet: z.boolean(),
  dietPlan: z.string().optional(),
  hasOtherServices: z.boolean(),
  otherServiceType: z.string().optional(),
  otherServicePrice: z.coerce.number().min(0).optional(),
  attachments: z.array(z.string()).default([]),
  overallAssessment: z.string(),
  totalReceived: z.coerce.number().min(0),
});

type FormData = z.infer<typeof formSchema>;

function formatDateTime(date: Date | string | null | undefined): { date: string; time: string } {
  if (!date) return { date: '-', time: '-' };
  const d = new Date(date);
  return {
    date: d.toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    time: d.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })
  };
}

export default function Home() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showPatientsList, setShowPatientsList] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [editPaymentValue, setEditPaymentValue] = useState(0);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0);
  const [newPaymentNote, setNewPaymentNote] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientName: "",
      age: 0,
      residence: "",
      phone: "",
      doctorName: "",
      diagnosis: "",
      doctorRequest: "",
      hasSurgery: false,
      surgeryType: "",
      needsMedicalCare: false,
      careType: "none",
      sessionType: "equipment",
      sessionCount: 0,
      sessionPrice: 0,
      needsMedicalAids: false,
      aidType: "",
      aidPrice: 0,
      hasDiet: false,
      dietPlan: "",
      hasOtherServices: false,
      otherServiceType: "",
      otherServicePrice: 0,
      attachments: [],
      overallAssessment: "",
      totalReceived: 0,
    },
  });

  const watchHasSurgery = form.watch("hasSurgery");
  const watchNeedsMedicalCare = form.watch("needsMedicalCare");
  const watchCareType = form.watch("careType");
  const watchNeedsMedicalAids = form.watch("needsMedicalAids");
  const watchHasDiet = form.watch("hasDiet");
  const watchHasOtherServices = form.watch("hasOtherServices");
  const watchSessionCount = Number(form.watch("sessionCount")) || 0;
  const watchSessionPrice = Number(form.watch("sessionPrice")) || 0;
  const watchAidPrice = Number(form.watch("aidPrice")) || 0;
  const watchOtherServicePrice = Number(form.watch("otherServicePrice")) || 0;

  const totalAmount = useMemo(() => {
    let total = 0;
    if (watchCareType === "sessions" && watchSessionCount && watchSessionPrice) {
      total += Number(watchSessionCount) * Number(watchSessionPrice);
    }
    if (watchNeedsMedicalAids && watchAidPrice) {
      total += Number(watchAidPrice);
    }
    if (watchHasOtherServices && watchOtherServicePrice) {
      total += Number(watchOtherServicePrice);
    }
    return total;
  }, [watchCareType, watchSessionCount, watchSessionPrice, watchNeedsMedicalAids, watchAidPrice, watchHasOtherServices, watchOtherServicePrice]);

  // Get cached patients for initial/offline data
  const cachedPatients = useMemo(() => getCachedPatients(), []);

  const { data: patients = cachedPatients, isLoading: patientsLoading, isError: patientsError } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    retry: isOnline ? 3 : 0,
    enabled: isOnline,
  });

  // Use cached data when offline or on error
  const displayPatients = useMemo(() => {
    if (!isOnline || patientsError) {
      return cachedPatients;
    }
    return patients;
  }, [isOnline, patientsError, patients, cachedPatients]);

  // Cache patients to local storage when they change
  useEffect(() => {
    if (patients.length > 0 && isOnline && !patientsError) {
      setCachedPatients(patients);
    }
  }, [patients, isOnline, patientsError]);

  // Sync to Google Sheets mutation
  const syncToSheetsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sync-to-sheets");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم المزامنة بنجاح",
        description: "تم مزامنة جميع البيانات مع Google Sheets",
      });
    },
    onError: () => {
      toast({
        title: "خطأ في المزامنة",
        description: "لم يتم مزامنة البيانات، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data: InsertPatient) => {
      const response = await apiRequest("POST", "/api/patients", data);
      return response.json();
    },
    onSuccess: (patient: Patient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      updateCachedPatient(patient);
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم حفظ بيانات المريض بنجاح وإرسالها إلى Google Sheets وتلغرام",
      });
      form.reset();
    },
    onError: () => {
      toast({
        title: "حدث خطأ",
        description: "لم يتم حفظ البيانات، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertPatient }) => {
      const response = await apiRequest("PATCH", `/api/patients/${id}`, data);
      return response.json();
    },
    onSuccess: (patient: Patient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      updateCachedPatient(patient);
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث بيانات المريض بنجاح",
      });
      form.reset();
      setEditingPatientId(null);
      setShowPatientsList(true);
    },
    onError: () => {
      toast({
        title: "حدث خطأ",
        description: "لم يتم تحديث البيانات، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, totalReceived }: { id: string; totalReceived: number }) => {
      const response = await apiRequest("PATCH", `/api/patients/${id}`, { totalReceived });
      return response.json();
    },
    onSuccess: (updatedPatient: Patient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      updateCachedPatient(updatedPatient);
      setSelectedPatient(updatedPatient);
      setIsEditingPayment(false);
      toast({
        title: "تم تحديث الدفع",
        description: "تم تحديث المبلغ المستلم بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "حدث خطأ",
        description: "لم يتم تحديث الدفع، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  // Fetch payments for selected patient
  const { data: patientPayments = [], refetch: refetchPayments } = useQuery<Payment[]>({
    queryKey: ["/api/patients", selectedPatient?.id, "payments"],
    enabled: !!selectedPatient?.id,
  });

  // Add payment mutation
  const addPaymentMutation = useMutation({
    mutationFn: async ({ patientId, amount, note }: { patientId: string; amount: number; note: string }) => {
      const response = await apiRequest("POST", `/api/patients/${patientId}/payments`, { amount, note });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", selectedPatient?.id, "payments"] });
      refetchPayments();
      // Refresh selected patient
      if (selectedPatient?.id) {
        fetch(`/api/patients/${selectedPatient.id}`)
          .then(res => res.json())
          .then(patient => {
            setSelectedPatient(patient);
            updateCachedPatient(patient);
          });
      }
      setShowAddPayment(false);
      setNewPaymentAmount(0);
      setNewPaymentNote("");
      toast({
        title: "تمت إضافة الدفعة",
        description: "تم تسجيل الدفعة بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "حدث خطأ",
        description: "لم يتم تسجيل الدفعة، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  // Delete payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      await apiRequest("DELETE", `/api/payments/${paymentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", selectedPatient?.id, "payments"] });
      refetchPayments();
      // Refresh selected patient
      if (selectedPatient?.id) {
        fetch(`/api/patients/${selectedPatient.id}`)
          .then(res => res.json())
          .then(patient => {
            setSelectedPatient(patient);
            updateCachedPatient(patient);
          });
      }
      toast({
        title: "تم حذف الدفعة",
        description: "تم حذف الدفعة بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "حدث خطأ",
        description: "لم يتم حذف الدفعة، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  // Delete patient mutation
  const deletePatientMutation = useMutation({
    mutationFn: async (patientId: string) => {
      await apiRequest("DELETE", `/api/patients/${patientId}`);
      return patientId;
    },
    onSuccess: (deletedPatientId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      removeCachedPatient(deletedPatientId);
      setSelectedPatient(null);
      toast({
        title: "تم حذف المريض",
        description: "تم حذف بيانات المريض بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "حدث خطأ",
        description: "لم يتم حذف المريض، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  // Toggle patient completed status mutation
  const toggleCompletedMutation = useMutation({
    mutationFn: async ({ patientId, isCompleted }: { patientId: string; isCompleted: boolean }) => {
      const response = await apiRequest("PATCH", `/api/patients/${patientId}`, { isCompleted });
      return response.json();
    },
    onSuccess: (updatedPatient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setSelectedPatient(updatedPatient);
      updateCachedPatient(updatedPatient);
      toast({
        title: updatedPatient.isCompleted ? "تم إنهاء المراجعات" : "تم استئناف المراجعات",
        description: updatedPatient.isCompleted 
          ? "تم تحديد المريض كمنتهي المراجعات" 
          : "تم إعادة تفعيل مراجعات المريض",
      });
    },
    onError: () => {
      toast({
        title: "حدث خطأ",
        description: "لم يتم تحديث الحالة، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const patientData: InsertPatient = {
      ...data,
      totalAmount,
    };
    
    if (editingPatientId) {
      updatePatientMutation.mutate({ id: editingPatientId, data: patientData });
    } else {
      createPatientMutation.mutate(patientData);
    }
  };

  const resetForm = () => {
    form.reset();
    setEditingPatientId(null);
    toast({
      title: "تم مسح النموذج",
      description: "تم مسح جميع البيانات من النموذج",
    });
  };

  const startEditing = (patient: Patient) => {
    setEditingPatientId(patient.id);
    setSelectedPatient(null);
    setShowPatientsList(false);
    form.reset({
      patientName: patient.patientName,
      age: patient.age,
      residence: patient.residence,
      phone: patient.phone,
      doctorName: patient.doctorName,
      diagnosis: patient.diagnosis || "",
      doctorRequest: patient.doctorRequest || "",
      hasSurgery: patient.hasSurgery || false,
      surgeryType: patient.surgeryType || "",
      needsMedicalCare: patient.needsMedicalCare || false,
      careType: (patient.careType as "homeExercises" | "sessions" | "none") || "none",
      sessionType: (patient.sessionType as "equipment" | "exercises") || "equipment",
      sessionCount: patient.sessionCount || 0,
      sessionPrice: patient.sessionPrice || 0,
      needsMedicalAids: patient.needsMedicalAids || false,
      aidType: patient.aidType || "",
      aidPrice: patient.aidPrice || 0,
      hasDiet: patient.hasDiet || false,
      dietPlan: patient.dietPlan || "",
      hasOtherServices: patient.hasOtherServices || false,
      otherServiceType: patient.otherServiceType || "",
      otherServicePrice: patient.otherServicePrice || 0,
      attachments: patient.attachments || [],
      overallAssessment: patient.overallAssessment || "",
      totalReceived: patient.totalReceived || 0,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header isOnline={isOnline} />
      
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={showPatientsList ? "default" : "outline"}
              onClick={() => setShowPatientsList(!showPatientsList)}
              data-testid="button-toggle-patients-list"
            >
              <List className="w-4 h-4 ml-2" />
              قائمة المراجعين ({displayPatients.length})
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowPatientsList(false); setEditingPatientId(null); form.reset(); }}
              data-testid="button-new-patient"
            >
              <Plus className="w-4 h-4 ml-2" />
              مراجع جديد
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => syncToSheetsMutation.mutate()}
            disabled={syncToSheetsMutation.isPending || !isOnline}
            data-testid="button-sync-sheets"
          >
            {syncToSheetsMutation.isPending ? (
              <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <CloudUpload className="w-4 h-4 ml-2" />
            )}
            مزامنة مع Google Sheets
          </Button>
        </div>

        {showPatientsList ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="w-5 h-5" />
                قائمة المراجعين
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isOnline && (
                <div className="text-center py-2 px-4 mb-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md text-sm">
                  وضع عدم الاتصال - يتم عرض البيانات المحفوظة محلياً
                </div>
              )}
              {patientsLoading && isOnline ? (
                <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
              ) : displayPatients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا يوجد مراجعين مسجلين
                </div>
              ) : (
                <div className="space-y-3">
                  {displayPatients.map((patient) => {
                    const dateTime = formatDateTime(patient.createdAt);
                    return (
                      <Card 
                        key={patient.id} 
                        className={`hover-elevate cursor-pointer ${patient.isCompleted ? 'opacity-60' : ''}`}
                        onClick={() => setSelectedPatient(patient)}
                        data-testid={`card-patient-${patient.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-lg">{patient.patientName}</h3>
                                {patient.isCompleted && (
                                  <Badge variant="secondary" className="text-xs">منتهي</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {patient.age} سنة | {patient.residence}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                الطبيب: {patient.doctorName}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                                <Calendar className="w-3 h-3" />
                                {dateTime.date}
                                <Clock className="w-3 h-3 mr-2" />
                                {dateTime.time}
                              </p>
                            </div>
                            <div className="text-left space-y-1">
                              <p className="font-bold text-primary">
                                {(patient.totalAmount || 0).toLocaleString()} د.ع
                              </p>
                              <p className="text-sm text-muted-foreground">
                                المستلم: {(patient.totalReceived || 0).toLocaleString()} د.ع
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {editingPatientId ? "تعديل بيانات المريض" : "بيانات المريض"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="patientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم المريض</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                              placeholder="أدخل اسم المريض" 
                              className="pr-10" 
                              {...field}
                              data-testid="input-patient-name"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>العمر</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="العمر" 
                              {...field}
                              data-testid="input-age"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم الهاتف</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input 
                                type="tel" 
                                placeholder="07xxxxxxxx" 
                                className="pr-10" 
                                {...field}
                                data-testid="input-phone"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="residence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>السكن</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                              placeholder="العنوان الكامل" 
                              className="pr-10" 
                              {...field}
                              data-testid="input-residence"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="doctorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم الطبيب</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Stethoscope className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                              placeholder="اسم الطبيب المعالج" 
                              className="pr-10" 
                              {...field}
                              data-testid="input-doctor-name"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="diagnosis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>التشخيص</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="التشخيص الطبي للحالة" 
                            rows={3}
                            {...field}
                            data-testid="input-diagnosis"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="doctorRequest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المطلوب من قبل الطبيب</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="توصيات وطلبات الطبيب" 
                            rows={3}
                            {...field}
                            data-testid="input-doctor-request"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scissors className="w-5 h-5" />
                    العمليات الجراحية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="hasSurgery"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>هل توجد عملية جراحية؟</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === "yes")}
                            value={field.value ? "yes" : "no"}
                            className="flex gap-6"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="yes" id="surgery-yes" data-testid="radio-surgery-yes" />
                              <Label htmlFor="surgery-yes">نعم</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="no" id="surgery-no" data-testid="radio-surgery-no" />
                              <Label htmlFor="surgery-no">لا</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchHasSurgery && (
                    <FormField
                      control={form.control}
                      name="surgeryType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نوع العملية</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="حدد نوع العملية الجراحية" 
                              {...field}
                              data-testid="input-surgery-type"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HeartPulse className="w-5 h-5" />
                    الرعاية الطبية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="needsMedicalCare"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>هل يحتاج الى رعاية طبية؟</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === "yes")}
                            value={field.value ? "yes" : "no"}
                            className="flex gap-6"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="yes" id="care-yes" data-testid="radio-care-yes" />
                              <Label htmlFor="care-yes">نعم</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="no" id="care-no" data-testid="radio-care-no" />
                              <Label htmlFor="care-no">لا</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchNeedsMedicalCare && (
                    <div className="space-y-4 pr-4 border-r-2 border-primary/20">
                      <FormField
                        control={form.control}
                        name="careType"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>نوع الرعاية</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex flex-col gap-3"
                              >
                                <div className="flex items-center gap-2">
                                  <RadioGroupItem value="homeExercises" id="care-home" data-testid="radio-care-home" />
                                  <Label htmlFor="care-home" className="flex items-center gap-2">
                                    <Dumbbell className="w-4 h-4" />
                                    تمارين منزلية
                                  </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <RadioGroupItem value="sessions" id="care-sessions" data-testid="radio-care-sessions" />
                                  <Label htmlFor="care-sessions" className="flex items-center gap-2">
                                    <Activity className="w-4 h-4" />
                                    جلسات علاجية
                                  </Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {watchCareType === "sessions" && (
                        <div className="space-y-4 pr-4 border-r-2 border-primary/10">
                          <FormField
                            control={form.control}
                            name="sessionType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>نوع الجلسات</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-session-type">
                                      <SelectValue placeholder="اختر نوع الجلسات" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="equipment">جلسات أجهزة</SelectItem>
                                    <SelectItem value="exercises">جلسات تمارين</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="sessionCount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>عدد الجلسات</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="0" 
                                      {...field}
                                      data-testid="input-session-count"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="sessionPrice"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>سعر الجلسة (د.ع)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="0" 
                                      {...field}
                                      data-testid="input-session-price"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HeartPulse className="w-5 h-5" />
                    المساند الطبية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="needsMedicalAids"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>هل يحتاج الى مساند طبية؟</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === "yes")}
                            value={field.value ? "yes" : "no"}
                            className="flex gap-6"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="yes" id="aids-yes" data-testid="radio-aids-yes" />
                              <Label htmlFor="aids-yes">نعم</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="no" id="aids-no" data-testid="radio-aids-no" />
                              <Label htmlFor="aids-no">لا</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchNeedsMedicalAids && (
                    <div className="space-y-4 pr-4 border-r-2 border-primary/20">
                      <FormField
                        control={form.control}
                        name="aidType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>نوع المسند</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="حدد نوع المسند الطبي" 
                                {...field}
                                data-testid="input-aid-type"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="aidPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>سعر المسند (د.ع)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="0" 
                                {...field}
                                data-testid="input-aid-price"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Utensils className="w-5 h-5" />
                    النظام الغذائي
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="hasDiet"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>هل يحتاج نظام غذائي؟</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === "yes")}
                            value={field.value ? "yes" : "no"}
                            className="flex gap-6"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="yes" id="diet-yes" data-testid="radio-diet-yes" />
                              <Label htmlFor="diet-yes">نعم</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="no" id="diet-no" data-testid="radio-diet-no" />
                              <Label htmlFor="diet-no">لا</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchHasDiet && (
                    <FormField
                      control={form.control}
                      name="dietPlan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تفاصيل النظام الغذائي</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="اكتب تفاصيل النظام الغذائي المطلوب..." 
                              rows={4}
                              {...field}
                              data-testid="input-diet-plan"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    خدمات أخرى
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="hasOtherServices"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>هل يوجد خدمات أخرى؟</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === "yes")}
                            value={field.value ? "yes" : "no"}
                            className="flex gap-6"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="yes" id="other-services-yes" data-testid="radio-other-services-yes" />
                              <Label htmlFor="other-services-yes">نعم</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="no" id="other-services-no" data-testid="radio-other-services-no" />
                              <Label htmlFor="other-services-no">لا</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchHasOtherServices && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="otherServiceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>نوع الخدمة</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="أدخل نوع الخدمة" 
                                {...field}
                                data-testid="input-other-service-type"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="otherServicePrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>سعر الخدمة (د.ع)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="0" 
                                {...field}
                                data-testid="input-other-service-price"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    المرفقات العلاجية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="attachments"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ImageUpload
                            images={field.value}
                            onImagesChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    الملخص المالي
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="overallAssessment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>التقييم الاجمالي</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="ملاحظات وتقييم الحالة العام" 
                            rows={3}
                            {...field}
                            data-testid="input-overall-assessment"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3 p-4 bg-muted/50 rounded-md">
                    {watchCareType === "sessions" && watchSessionCount > 0 && watchSessionPrice > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">جلسات العلاج الطبيعي ({watchSessionCount} جلسة × {watchSessionPrice.toLocaleString()}):</span>
                        <span className="font-medium" data-testid="text-therapy-cost">
                          {(watchSessionCount * watchSessionPrice).toLocaleString()} د.ع
                        </span>
                      </div>
                    )}
                    {watchNeedsMedicalAids && watchAidPrice > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">المساند الطبية:</span>
                        <span className="font-medium" data-testid="text-aids-cost">
                          {watchAidPrice.toLocaleString()} د.ع
                        </span>
                      </div>
                    )}
                    {watchHasOtherServices && watchOtherServicePrice > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">خدمات أخرى:</span>
                        <span className="font-medium" data-testid="text-other-services-cost">
                          {watchOtherServicePrice.toLocaleString()} د.ع
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-3 flex items-center justify-between">
                      <span className="font-semibold">المبلغ الاجمالي:</span>
                      <span className="text-2xl font-bold text-primary" data-testid="text-total-amount">
                        {totalAmount.toLocaleString()} د.ع
                      </span>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="totalReceived"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Wallet className="w-4 h-4" />
                          المبلغ الواصل (د.ع)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field}
                            data-testid="input-total-received"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {totalAmount > 0 && (
                    <div className="p-4 bg-destructive/10 rounded-md border border-destructive/20">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">المبلغ المتبقي:</span>
                        <span className="text-xl font-bold text-destructive" data-testid="text-remaining">
                          {(totalAmount - Number(form.watch("totalReceived") || 0)).toLocaleString()} د.ع
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={createPatientMutation.isPending || updatePatientMutation.isPending}
                  data-testid="button-save-patient"
                >
                  {(createPatientMutation.isPending || updatePatientMutation.isPending) ? (
                    <>جاري الحفظ...</>
                  ) : editingPatientId ? (
                    <>
                      <Save className="w-4 h-4 ml-2" />
                      تحديث بيانات المريض
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 ml-2" />
                      حفظ بيانات المريض
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={resetForm}
                  data-testid="button-reset-form"
                >
                  <RotateCcw className="w-4 h-4 ml-2" />
                  {editingPatientId ? "إلغاء التعديل" : "مسح النموذج"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </main>

      <footer className="border-t py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          مركز اضواء الساير للعلاج الطبيعي والمساند الطبية © {new Date().getFullYear()}
        </div>
      </footer>

      <Dialog open={!!selectedPatient} onOpenChange={() => { setSelectedPatient(null); setIsEditingPayment(false); setShowAddPayment(false); setNewPaymentAmount(0); setNewPaymentNote(""); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                تفاصيل المراجع
                {selectedPatient?.isCompleted && (
                  <Badge variant="secondary" className="text-xs">منتهي</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectedPatient && startEditing(selectedPatient)}
                  data-testid="button-edit-patient"
                >
                  <Pencil className="w-3 h-3 ml-1" />
                  تعديل
                </Button>
                <Button
                  size="sm"
                  variant={selectedPatient?.isCompleted ? "default" : "outline"}
                  onClick={() => selectedPatient && toggleCompletedMutation.mutate({ 
                    patientId: selectedPatient.id, 
                    isCompleted: !selectedPatient.isCompleted 
                  })}
                  disabled={toggleCompletedMutation.isPending}
                  data-testid="button-toggle-completed"
                >
                  {selectedPatient?.isCompleted ? (
                    <>
                      <RotateCcw className="w-3 h-3 ml-1" />
                      استئناف
                    </>
                  ) : (
                    <>
                      <Check className="w-3 h-3 ml-1" />
                      إنهاء المراجعات
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (selectedPatient && confirm("هل أنت متأكد من حذف بيانات هذا المريض؟ لا يمكن التراجع عن هذا الإجراء.")) {
                      deletePatientMutation.mutate(selectedPatient.id);
                    }
                  }}
                  disabled={deletePatientMutation.isPending}
                  data-testid="button-delete-patient"
                >
                  <Trash2 className="w-3 h-3 ml-1" />
                  حذف
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedPatient && (
            <ScrollArea className="h-[70vh] pl-4">
              <div className="space-y-6">
                {(() => {
                  const dateTime = formatDateTime(selectedPatient.createdAt);
                  const totalAmount = selectedPatient.totalAmount || 0;
                  const totalReceived = selectedPatient.totalReceived || 0;
                  const remaining = totalAmount - totalReceived;
                  
                  return (
                    <>
                      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-md flex-wrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{dateTime.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{dateTime.time}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <User className="w-4 h-4" />
                          البيانات الشخصية
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">الاسم:</span>
                            <p className="font-medium">{selectedPatient.patientName}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">العمر:</span>
                            <p className="font-medium">{selectedPatient.age} سنة</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">السكن:</span>
                            <p className="font-medium">{selectedPatient.residence}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">الهاتف:</span>
                            <p className="font-medium">{selectedPatient.phone}</p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Stethoscope className="w-4 h-4" />
                          البيانات الطبية
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">الطبيب:</span>
                            <p className="font-medium">{selectedPatient.doctorName}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">التشخيص:</span>
                            <p className="font-medium">{selectedPatient.diagnosis || '-'}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">طلب الطبيب:</span>
                            <p className="font-medium">{selectedPatient.doctorRequest || '-'}</p>
                          </div>
                        </div>
                      </div>

                      {selectedPatient.hasSurgery && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Scissors className="w-4 h-4" />
                              العملية الجراحية
                            </h3>
                            <div className="text-sm">
                              <span className="text-muted-foreground">نوع العملية:</span>
                              <p className="font-medium">{selectedPatient.surgeryType || '-'}</p>
                            </div>
                          </div>
                        </>
                      )}

                      {selectedPatient.careType && selectedPatient.careType !== 'none' && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                              <HeartPulse className="w-4 h-4" />
                              الرعاية الطبية
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">نوع الرعاية:</span>
                                <p className="font-medium">
                                  {selectedPatient.careType === 'homeExercises' || selectedPatient.careType === 'home_exercises' ? 'تمارين منزلية' : 'جلسات علاجية'}
                                </p>
                              </div>
                              {selectedPatient.sessionCount && selectedPatient.sessionCount > 0 && (
                                <>
                                  <div>
                                    <span className="text-muted-foreground">عدد الجلسات:</span>
                                    <p className="font-medium">{selectedPatient.sessionCount}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">سعر الجلسة:</span>
                                    <p className="font-medium">{(selectedPatient.sessionPrice || 0).toLocaleString()} د.ع</p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {selectedPatient.aidType && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Activity className="w-4 h-4" />
                              المساند الطبية
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">النوع:</span>
                                <p className="font-medium">{selectedPatient.aidType}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">السعر:</span>
                                <p className="font-medium">{(selectedPatient.aidPrice || 0).toLocaleString()} د.ع</p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {selectedPatient.hasDiet && selectedPatient.dietPlan && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Utensils className="w-4 h-4" />
                              النظام الغذائي
                            </h3>
                            <p className="text-sm">{selectedPatient.dietPlan}</p>
                          </div>
                        </>
                      )}

                      {selectedPatient.hasOtherServices && selectedPatient.otherServiceType && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              خدمات أخرى
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">نوع الخدمة:</span>
                                <p className="font-medium">{selectedPatient.otherServiceType}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">السعر:</span>
                                <p className="font-medium">{(selectedPatient.otherServicePrice || 0).toLocaleString()} د.ع</p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {selectedPatient.overallAssessment && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <h3 className="font-semibold">التقييم العام</h3>
                            <p className="text-sm">{selectedPatient.overallAssessment}</p>
                          </div>
                        </>
                      )}

                      {selectedPatient.attachments && selectedPatient.attachments.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              المرفقات ({selectedPatient.attachments.length})
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {selectedPatient.attachments.map((img, idx) => (
                                <img 
                                  key={idx} 
                                  src={img} 
                                  alt={`مرفق ${idx + 1}`} 
                                  className="rounded-md border object-cover w-full h-24"
                                />
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Calculator className="w-4 h-4" />
                          الملخص المالي
                        </h3>
                        <div className="space-y-2 p-4 bg-muted/50 rounded-md">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">المبلغ الإجمالي:</span>
                            <span className="font-bold text-primary">{totalAmount.toLocaleString()} د.ع</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">المبلغ المستلم:</span>
                            <span className="font-medium">{totalReceived.toLocaleString()} د.ع</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between">
                            <span className="font-semibold">المتبقي:</span>
                            <span className={`font-bold ${remaining > 0 ? 'text-destructive' : 'text-green-600'}`}>
                              {remaining.toLocaleString()} د.ع
                            </span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            سجل الدفعات
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowAddPayment(true)}
                            data-testid="button-add-payment"
                          >
                            <Plus className="w-3 h-3 ml-1" />
                            إضافة دفعة
                          </Button>
                        </h3>

                        {showAddPayment && (
                          <div className="space-y-3 p-4 bg-muted/50 rounded-md border">
                            <div className="space-y-2">
                              <Label className="text-sm">مبلغ الدفعة (د.ع)</Label>
                              <Input
                                type="number"
                                value={newPaymentAmount || ""}
                                onChange={(e) => setNewPaymentAmount(Number(e.target.value))}
                                placeholder="أدخل المبلغ"
                                data-testid="input-new-payment-amount"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">ملاحظة (اختياري)</Label>
                              <Input
                                value={newPaymentNote}
                                onChange={(e) => setNewPaymentNote(e.target.value)}
                                placeholder="مثال: دفعة أولى"
                                data-testid="input-new-payment-note"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (newPaymentAmount > 0) {
                                    addPaymentMutation.mutate({
                                      patientId: selectedPatient.id,
                                      amount: newPaymentAmount,
                                      note: newPaymentNote,
                                    });
                                  }
                                }}
                                disabled={addPaymentMutation.isPending || newPaymentAmount <= 0}
                                data-testid="button-save-new-payment"
                              >
                                {addPaymentMutation.isPending ? "جاري الحفظ..." : "حفظ الدفعة"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setShowAddPayment(false);
                                  setNewPaymentAmount(0);
                                  setNewPaymentNote("");
                                }}
                                data-testid="button-cancel-new-payment"
                              >
                                إلغاء
                              </Button>
                            </div>
                          </div>
                        )}

                        {patientPayments.length > 0 ? (
                          <div className="space-y-2">
                            {patientPayments.map((payment) => {
                              const paymentDate = formatDateTime(payment.createdAt);
                              return (
                                <div
                                  key={payment.id}
                                  className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                                  data-testid={`payment-row-${payment.id}`}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium text-primary">
                                        {payment.amount.toLocaleString()} د.ع
                                      </span>
                                      {payment.note && (
                                        <Badge variant="secondary" className="text-xs">
                                          {payment.note}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {paymentDate.date} - {paymentDate.time}
                                    </div>
                                  </div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-destructive"
                                    onClick={() => deletePaymentMutation.mutate(payment.id)}
                                    disabled={deletePaymentMutation.isPending}
                                    data-testid={`button-delete-payment-${payment.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            لا توجد دفعات مسجلة
                          </p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
