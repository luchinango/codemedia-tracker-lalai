export type UserRole = "admin" | "dev" | "client";
export type ProjectStatus = "active" | "paused" | "completed" | "cancelled";
export type IssueStatus = "todo" | "in_progress" | "done";
export type PaymentMethod = "Transferencia" | "PayPal" | "Efectivo" | "Crypto";
export type Currency = "USD" | "BOB";
export type PaymentType = "Total" | "Parcial";

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          tax_id: string | null;
          payment_method: PaymentMethod;
          billing_details: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          tax_id?: string | null;
          payment_method?: PaymentMethod;
          billing_details?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          tax_id?: string | null;
          payment_method?: PaymentMethod;
          billing_details?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: UserRole;
          hourly_rate: number;
          pretension_salarial: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          role?: UserRole;
          hourly_rate?: number;
          pretension_salarial?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          role?: UserRole;
          hourly_rate?: number;
          pretension_salarial?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          name: string;
          client_email: string;
          quoted_price: number;
          status: ProjectStatus;
          company_id: string | null;
          currency: Currency;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          client_email: string;
          quoted_price?: number;
          status?: ProjectStatus;
          company_id?: string | null;
          currency?: Currency;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          client_email?: string;
          quoted_price?: number;
          status?: ProjectStatus;
          company_id?: string | null;
          currency?: Currency;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      issues: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          status: IssueStatus;
          estimated_hours: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          status?: IssueStatus;
          estimated_hours?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string | null;
          status?: IssueStatus;
          estimated_hours?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "issues_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      time_logs: {
        Row: {
          id: string;
          issue_id: string;
          user_id: string;
          start_time: string;
          end_time: string | null;
          duration_minutes: number | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          issue_id: string;
          user_id: string;
          start_time?: string;
          end_time?: string | null;
          duration_minutes?: number | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          issue_id?: string;
          user_id?: string;
          start_time?: string;
          end_time?: string | null;
          duration_minutes?: number | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_logs_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      issue_assignments: {
        Row: {
          issue_id: string;
          user_id: string;
          assigned_at: string;
        };
        Insert: {
          issue_id: string;
          user_id: string;
          assigned_at?: string;
        };
        Update: {
          issue_id?: string;
          user_id?: string;
          assigned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "issue_assignments_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issue_assignments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          project_id: string;
          amount: number;
          currency: Currency;
          date: string;
          type: PaymentType;
          is_invoiced: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          amount: number;
          currency?: Currency;
          date?: string;
          type?: PaymentType;
          is_invoiced?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          amount?: number;
          currency?: Currency;
          date?: string;
          type?: PaymentType;
          is_invoiced?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_logs: {
        Row: {
          id: string;
          project_id: string;
          issue_id: string | null;
          client_email: string;
          event_type: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          issue_id?: string | null;
          client_email: string;
          event_type: string;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          issue_id?: string | null;
          client_email?: string;
          event_type?: string;
          message?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_logs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_logs_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      project_status: ProjectStatus;
      issue_status: IssueStatus;
      payment_method: PaymentMethod;
    };
  };
}
