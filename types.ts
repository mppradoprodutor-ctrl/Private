
export interface Driver {
  id: string;
  truckPlate: string;      
  trailer1: string;       
  trailer2: string;       
  dolly: string;          
  name: string;           
  phone: string;          
  cnh: string;            
  rg: string;             
  cpf: string;            
  trailerType: string;    
  netWeight: number;      
  grossWeight: number;    
  axisCount: number;      
  trailerModel: string;   
  antt: string;           
  renavam: string;        
  notes: string;          
  state: string;          
  createdAt: string;
}

export interface Freight {
  id: string;
  location?: string;
  origin: string;           
  state: string;            
  destination: string;      
  destinationState: string; 
  dischargeTerminal: string; 
  companyTariff: number;    
  driverTariff: number;     
  serviceTaker: string;     
  product: string;
  collectionAddress: string; 
  destinationAddress: string; 
  restrictions: string;     
  notes: string;            
  axles?: string[];         
  distance?: string;        
  deductIcms: boolean;      
  icmsRate: number;        
  active: boolean;          
  createdAt: string;
}

export interface ThirdPartyFreight {
  id: string;
  carrier: string;
  product: string;
  origin: string;
  destination: string;
  freightRate: number;
  distanceKm: number;
  notes?: string;
  createdAt: string;
}

export interface OperationalUnit {
  id: string;
  cnpj: string;
  companyName?: string;
  stateRegistration?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  name?: string;
  isDefault?: boolean;
  createdAt?: string;
}

export interface Trip {
  id: string;
  date: string;               
  location?: string;
  origin: string;             
  originState?: string;       
  destination: string;        
  destinationState?: string;  
  dischargeTerminal: string;  
  cteNumber: string;          
  invoiceNumber: string;      
  companyTariff: number;      
  driverTariff: number;       
  truckPlate: string;         
  driverName?: string;
  driverPhone?: string;
  freightId?: string;
  serviceTaker?: string;
  product?: string;
  weight: number;
  paymentType: string;        
  notes: string;              
  pendingDocument?: string;    
  status: 'Pendente' | 'Carregado' | 'Finalizado'; 
  orderNumber?: number;
  mdfeStatus?: 'Pendente' | 'Baixado';
  deductIcms?: boolean;       
  icmsRate?: number;         
  adNote?: string;
  sdNote?: string;
  sdFlag?: boolean;
  operationalUnitCnpj?: string;
  operationalUnitName?: string;
  operationalUnitCompanyName?: string;
  operationalUnitIe?: string;
  operationalUnitStreet?: string;
  operationalUnitNumber?: string;
  operationalUnitNeighborhood?: string;
  operationalUnitCity?: string;
  operationalUnitState?: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  subject: string;
  note: string;
  time: string; // ISO string
  viewed: boolean;
  completed?: boolean;
  createdAt: string;
}

export interface Shipment {
  id: string;
  shipmentDate: string; // A
  branch: string;       // B
  driver: string;       // C
  phone: string;        // D
  plate: string;        // E
  weight: number;       // F
  dispatch: string;     // G
  origin: string;       // H
  destination: string;  // I
  status: string;       // J
  forecast: string;     // K
  operation: string;    // L
  product: string;      // M
  type: string;         // N
  client: string;       // O
  ppte: string;         // P
  pptm: string;         // Q
  obs: string;          // R
  originalStatus?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  emails: string[];
  phones: string[];
  createdAt: string;
  updatedAt?: string;
}

export type ViewState = 'dashboard' | 'drivers' | 'freights' | 'thirdPartyFreights' | 'trips' | 'loadingOrder' | 'shipments' | 'reminders' | 'database' | 'market' | 'map' | 'reports' | 'notes';
