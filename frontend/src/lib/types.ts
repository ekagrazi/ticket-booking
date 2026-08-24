export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          role: 'customer' | 'organiser' | 'admin'
          created_at: string
        }
      }
      venues: {
        Row: {
          id: string
          name: string
          address: string | null
          created_by: string | null
          created_at: string
        }
      }
      venue_seats: {
        Row: {
          id: string
          venue_id: string
          section: string
          row_label: string
          seat_number: number
          category: string
          pos_x: number
          pos_y: number
        }
      }
      events: {
        Row: {
          id: string
          organiser_id: string
          title: string
          type: 'movie' | 'concert'
          description: string | null
          poster_url: string | null
          created_at: string
        }
      }
      shows: {
        Row: {
          id: string
          event_id: string
          venue_id: string
          show_date: string
          show_time: string
          status: 'scheduled' | 'cancelled' | 'completed'
          created_at: string
        }
      }
      show_categories: {
        Row: {
          id: string
          show_id: string
          category: string
          price: number
        }
      }
      show_seats: {
        Row: {
          id: string
          show_id: string
          venue_seat_id: string
          category: string
          status: 'available' | 'held' | 'booked'
          held_by: string | null
          held_until: string | null
          booking_id: string | null
          version: number
        }
      }
      bookings: {
        Row: {
          id: string
          booking_ref: string
          customer_id: string
          show_id: string
          status: 'confirmed' | 'cancelled'
          total_amount: number
          qr_code_url: string | null
          created_at: string
          cancelled_at: string | null
        }
      }
      waitlist_entries: {
        Row: {
          id: string
          show_id: string
          customer_id: string
          category: string
          status: 'waiting' | 'offered' | 'fulfilled' | 'expired' | 'cancelled'
          created_at: string
        }
      }
    }
    Views: {
      show_seat_map: {
        Row: {
          show_seat_id: string
          show_id: string
          status: 'available' | 'held' | 'booked'
          category: string
          held_by: string | null
          held_until: string | null
          section: string
          row_label: string
          seat_number: number
          pos_x: number
          pos_y: number
        }
      }
    }
    Functions: {
      hold_seats: {
        Args: { p_show_id: string; p_seat_ids: string[]; p_ttl_minutes?: number }
        Returns: any
      }
      release_seats: {
        Args: { p_show_id: string; p_seat_ids: string[] }
        Returns: any
      }
      confirm_booking: {
        Args: { p_show_id: string; p_seat_ids: string[] }
        Returns: Database['public']['Tables']['bookings']['Row']
      }
      cancel_booking: {
        Args: { p_booking_id: string }
        Returns: void
      }
      join_waitlist: {
        Args: { p_show_id: string; p_category: string }
        Returns: Database['public']['Tables']['waitlist_entries']['Row']
      }
      complete_waitlist_offer: {
        Args: { p_offer_token: string }
        Returns: Database['public']['Tables']['bookings']['Row']
      }
      create_event: {
        Args: { p_title: string; p_type: string; p_description?: string; p_poster_url?: string }
        Returns: Database['public']['Tables']['events']['Row']
      }
      create_show: {
        Args: { p_event_id: string; p_venue_id: string; p_show_date: string; p_show_time: string; p_pricing: Record<string, number> }
        Returns: Database['public']['Tables']['shows']['Row']
      }
      create_venue: {
        Args: { p_name: string; p_address?: string; p_seats?: any[] }
        Returns: Database['public']['Tables']['venues']['Row']
      }
      get_organiser_revenue: {
        Args: { p_event_id: string }
        Returns: Array<{
          show_id: string; show_date: string; show_time: string; venue_name: string;
          total_bookings: number; total_revenue: number; cancelled_count: number; seat_capacity: number;
        }>
      }
    }
  }
}
