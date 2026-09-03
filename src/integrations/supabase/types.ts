export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analytics_behavior_events: {
        Row: {
          created_at: string
          data: Json | null
          event_type: string
          id: string
          page_path: string | null
          session_id: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          event_type: string
          id?: string
          page_path?: string | null
          session_id?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          event_type?: string
          id?: string
          page_path?: string | null
          session_id?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      analytics_clicks: {
        Row: {
          click_x: number | null
          click_y: number | null
          created_at: string
          element_class: string | null
          element_id: string | null
          element_tag: string | null
          element_text: string | null
          id: string
          page_path: string
          session_id: string
          visitor_id: string
        }
        Insert: {
          click_x?: number | null
          click_y?: number | null
          created_at?: string
          element_class?: string | null
          element_id?: string | null
          element_tag?: string | null
          element_text?: string | null
          id?: string
          page_path: string
          session_id: string
          visitor_id: string
        }
        Update: {
          click_x?: number | null
          click_y?: number | null
          created_at?: string
          element_class?: string | null
          element_id?: string | null
          element_tag?: string | null
          element_text?: string | null
          id?: string
          page_path?: string
          session_id?: string
          visitor_id?: string
        }
        Relationships: []
      }
      analytics_errors: {
        Row: {
          created_at: string
          error_message: string | null
          error_type: string | null
          id: string
          page_path: string | null
          session_id: string | null
          stack_trace: string | null
          status_code: number | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          error_type?: string | null
          id?: string
          page_path?: string | null
          session_id?: string | null
          stack_trace?: string | null
          status_code?: number | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          error_type?: string | null
          id?: string
          page_path?: string | null
          session_id?: string | null
          stack_trace?: string | null
          status_code?: number | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_category: string | null
          event_data: Json | null
          event_name: string
          id: string
          page_path: string | null
          session_id: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          event_category?: string | null
          event_data?: Json | null
          event_name: string
          id?: string
          page_path?: string | null
          session_id: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          event_category?: string | null
          event_data?: Json | null
          event_name?: string
          id?: string
          page_path?: string | null
          session_id?: string
          visitor_id?: string
        }
        Relationships: []
      }
      analytics_form_captures: {
        Row: {
          created_at: string
          field_name: string | null
          field_type: string | null
          id: string
          page_path: string | null
          session_id: string | null
          value: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          field_name?: string | null
          field_type?: string | null
          id?: string
          page_path?: string | null
          session_id?: string | null
          value?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          field_name?: string | null
          field_type?: string | null
          id?: string
          page_path?: string | null
          session_id?: string | null
          value?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      analytics_page_views: {
        Row: {
          created_at: string
          id: string
          load_time_ms: number | null
          page_path: string
          page_title: string | null
          referrer: string | null
          scroll_depth_percent: number | null
          session_id: string
          time_on_page_seconds: number | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          load_time_ms?: number | null
          page_path: string
          page_title?: string | null
          referrer?: string | null
          scroll_depth_percent?: number | null
          session_id: string
          time_on_page_seconds?: number | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          load_time_ms?: number | null
          page_path?: string
          page_title?: string | null
          referrer?: string | null
          scroll_depth_percent?: number | null
          session_id?: string
          time_on_page_seconds?: number | null
          visitor_id?: string
        }
        Relationships: []
      }
      analytics_sessions: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          duration_seconds: number | null
          ended_at: string | null
          entry_page: string | null
          exit_page: string | null
          id: string
          ip_hash: string | null
          is_bounce: boolean | null
          os: string | null
          page_count: number | null
          referrer: string | null
          session_id: string
          started_at: string
          traffic_source: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          entry_page?: string | null
          exit_page?: string | null
          id?: string
          ip_hash?: string | null
          is_bounce?: boolean | null
          os?: string | null
          page_count?: number | null
          referrer?: string | null
          session_id: string
          started_at?: string
          traffic_source?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          entry_page?: string | null
          exit_page?: string | null
          id?: string
          ip_hash?: string | null
          is_bounce?: boolean | null
          os?: string | null
          page_count?: number | null
          referrer?: string | null
          session_id?: string
          started_at?: string
          traffic_source?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      analytics_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      analytics_visitor_profiles: {
        Row: {
          asn: string | null
          battery_charging: boolean | null
          battery_level: number | null
          browser: string | null
          captured_emails: Json | null
          captured_names: Json | null
          captured_phones: Json | null
          city: string | null
          color_depth: number | null
          cookies_enabled: boolean | null
          country: string | null
          country_code: string | null
          cpu_cores: number | null
          created_at: string
          device_fingerprint_hash: string | null
          device_memory_gb: number | null
          device_type: string | null
          do_not_track: boolean | null
          first_seen_at: string
          gpu_renderer: string | null
          gpu_vendor: string | null
          id: string
          ip_address: string | null
          isp: string | null
          languages: Json | null
          last_seen_at: string
          latitude: number | null
          longitude: number | null
          max_touch_points: number | null
          network_downlink: number | null
          network_type: string | null
          org: string | null
          os: string | null
          pixel_ratio: number | null
          postal_code: string | null
          rage_click_count: number
          region: string | null
          screen_resolution: string | null
          timezone: string | null
          total_clicks: number
          total_pageviews: number
          total_time_seconds: number
          touch_support: boolean | null
          updated_at: string
          user_agent: string | null
          viewport: string | null
          visit_count: number
          visitor_id: string
        }
        Insert: {
          asn?: string | null
          battery_charging?: boolean | null
          battery_level?: number | null
          browser?: string | null
          captured_emails?: Json | null
          captured_names?: Json | null
          captured_phones?: Json | null
          city?: string | null
          color_depth?: number | null
          cookies_enabled?: boolean | null
          country?: string | null
          country_code?: string | null
          cpu_cores?: number | null
          created_at?: string
          device_fingerprint_hash?: string | null
          device_memory_gb?: number | null
          device_type?: string | null
          do_not_track?: boolean | null
          first_seen_at?: string
          gpu_renderer?: string | null
          gpu_vendor?: string | null
          id?: string
          ip_address?: string | null
          isp?: string | null
          languages?: Json | null
          last_seen_at?: string
          latitude?: number | null
          longitude?: number | null
          max_touch_points?: number | null
          network_downlink?: number | null
          network_type?: string | null
          org?: string | null
          os?: string | null
          pixel_ratio?: number | null
          postal_code?: string | null
          rage_click_count?: number
          region?: string | null
          screen_resolution?: string | null
          timezone?: string | null
          total_clicks?: number
          total_pageviews?: number
          total_time_seconds?: number
          touch_support?: boolean | null
          updated_at?: string
          user_agent?: string | null
          viewport?: string | null
          visit_count?: number
          visitor_id: string
        }
        Update: {
          asn?: string | null
          battery_charging?: boolean | null
          battery_level?: number | null
          browser?: string | null
          captured_emails?: Json | null
          captured_names?: Json | null
          captured_phones?: Json | null
          city?: string | null
          color_depth?: number | null
          cookies_enabled?: boolean | null
          country?: string | null
          country_code?: string | null
          cpu_cores?: number | null
          created_at?: string
          device_fingerprint_hash?: string | null
          device_memory_gb?: number | null
          device_type?: string | null
          do_not_track?: boolean | null
          first_seen_at?: string
          gpu_renderer?: string | null
          gpu_vendor?: string | null
          id?: string
          ip_address?: string | null
          isp?: string | null
          languages?: Json | null
          last_seen_at?: string
          latitude?: number | null
          longitude?: number | null
          max_touch_points?: number | null
          network_downlink?: number | null
          network_type?: string | null
          org?: string | null
          os?: string | null
          pixel_ratio?: number | null
          postal_code?: string | null
          rage_click_count?: number
          region?: string | null
          screen_resolution?: string | null
          timezone?: string | null
          total_clicks?: number
          total_pageviews?: number
          total_time_seconds?: number
          touch_support?: boolean | null
          updated_at?: string
          user_agent?: string | null
          viewport?: string | null
          visit_count?: number
          visitor_id?: string
        }
        Relationships: []
      }
      analytics_visitors: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          first_seen_at: string
          id: string
          is_returning: boolean | null
          language: string | null
          last_seen_at: string
          os: string | null
          screen_resolution: string | null
          total_visits: number | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          first_seen_at?: string
          id?: string
          is_returning?: boolean | null
          language?: string | null
          last_seen_at?: string
          os?: string | null
          screen_resolution?: string | null
          total_visits?: number | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          first_seen_at?: string
          id?: string
          is_returning?: boolean | null
          language?: string | null
          last_seen_at?: string
          os?: string | null
          screen_resolution?: string | null
          total_visits?: number | null
          visitor_id?: string
        }
        Relationships: []
      }
      app_info: {
        Row: {
          app_description: string | null
          app_icon_url: string | null
          app_name: string
          created_at: string
          download_url: string | null
          features: Json | null
          id: string
          is_visible: boolean
          package_name: string | null
          play_store_url: string | null
          screenshots: Json | null
          updated_at: string
          version: string | null
        }
        Insert: {
          app_description?: string | null
          app_icon_url?: string | null
          app_name: string
          created_at?: string
          download_url?: string | null
          features?: Json | null
          id?: string
          is_visible?: boolean
          package_name?: string | null
          play_store_url?: string | null
          screenshots?: Json | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          app_description?: string | null
          app_icon_url?: string | null
          app_name?: string
          created_at?: string
          download_url?: string | null
          features?: Json | null
          id?: string
          is_visible?: boolean
          package_name?: string | null
          play_store_url?: string | null
          screenshots?: Json | null
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      book_chapters: {
        Row: {
          book_id: string
          chapter_number: number
          content: string
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          min_tier: string
          reading_minutes: number | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          book_id: string
          chapter_number?: number
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          min_tier?: string
          reading_minutes?: number | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          chapter_number?: number
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          min_tier?: string
          reading_minutes?: number | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author_name: string
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          slug: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          slug: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_feedback: {
        Row: {
          created_at: string
          feedback_text: string | null
          id: string
          rating: number | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          feedback_text?: string | null
          id?: string
          rating?: number | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          feedback_text?: string | null
          id?: string
          rating?: number | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_queries: {
        Row: {
          created_at: string
          id: string
          language: string | null
          matched_page_path: string | null
          query: string
          response: string | null
          session_id: string | null
          was_answered: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string | null
          matched_page_path?: string | null
          query: string
          response?: string | null
          session_id?: string | null
          was_answered?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          language?: string | null
          matched_page_path?: string | null
          query?: string
          response?: string | null
          session_id?: string | null
          was_answered?: boolean | null
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          closed_at: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          opened_at: string
          page_url: string | null
          session_id: string
          user_agent: string | null
          user_ip: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          opened_at?: string
          page_url?: string | null
          session_id: string
          user_agent?: string | null
          user_ip?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          opened_at?: string
          page_url?: string | null
          session_id?: string
          user_agent?: string | null
          user_ip?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          currency: string
          error_reason: string | null
          id: string
          message: string | null
          name: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          error_reason?: string | null
          id?: string
          message?: string | null
          name?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          error_reason?: string | null
          id?: string
          message?: string | null
          name?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan_slug: string
          source: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_slug: string
          source?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_slug?: string
          source?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_plan_slug_fkey"
            columns: ["plan_slug"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["slug"]
          },
        ]
      }
      personal_login_events: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_label: string | null
          event_type: string
          id: string
          ip_address: string | null
          os: string | null
          region: string | null
          session_fingerprint: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_label?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          os?: string | null
          region?: string | null
          session_fingerprint?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_label?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          os?: string | null
          region?: string | null
          session_fingerprint?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plan_payments: {
        Row: {
          amount: number
          buyer_email: string | null
          buyer_name: string | null
          created_at: string
          currency: string
          id: string
          plan_slug: string
          provider: string
          provider_payment_id: string | null
          provider_request_id: string | null
          raw_payload: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          buyer_email?: string | null
          buyer_name?: string | null
          created_at?: string
          currency?: string
          id?: string
          plan_slug: string
          provider?: string
          provider_payment_id?: string | null
          provider_request_id?: string | null
          raw_payload?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          buyer_email?: string | null
          buyer_name?: string | null
          created_at?: string
          currency?: string
          id?: string
          plan_slug?: string
          provider?: string
          provider_payment_id?: string | null
          provider_request_id?: string | null
          raw_payload?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          billing_period: string
          created_at: string
          description: string | null
          display_order: number
          duration_days: number | null
          features: Json
          id: string
          is_highlighted: boolean
          is_visible: boolean
          name: string
          price_inr: number
          slug: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          billing_period?: string
          created_at?: string
          description?: string | null
          display_order?: number
          duration_days?: number | null
          features?: Json
          id?: string
          is_highlighted?: boolean
          is_visible?: boolean
          name: string
          price_inr?: number
          slug: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          billing_period?: string
          created_at?: string
          description?: string | null
          display_order?: number
          duration_days?: number | null
          features?: Json
          id?: string
          is_highlighted?: boolean
          is_visible?: boolean
          name?: string
          price_inr?: number
          slug?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_visible: boolean
          live_url: string | null
          long_description: string | null
          platform: string | null
          source_url: string | null
          status: string | null
          tech_stack: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_visible?: boolean
          live_url?: string | null
          long_description?: string | null
          platform?: string | null
          source_url?: string | null
          status?: string | null
          tech_stack?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_visible?: boolean
          live_url?: string | null
          long_description?: string | null
          platform?: string | null
          source_url?: string | null
          status?: string | null
          tech_stack?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pov_comments: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          is_anonymous: boolean
          parent_comment_id: string | null
          post_id: string
        }
        Insert: {
          author_name?: string
          content: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          parent_comment_id?: string | null
          post_id: string
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          parent_comment_id?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pov_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "pov_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pov_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "pov_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      pov_posts: {
        Row: {
          agree_count: number
          author_name: string
          category: string
          comment_count: number
          content: string
          created_at: string
          disagree_count: number
          display_order: number
          excerpt: string | null
          id: string
          is_featured: boolean
          is_hot_take: boolean
          is_visible: boolean
          language: string
          min_tier: string
          post_type: string
          title: string
          updated_at: string
        }
        Insert: {
          agree_count?: number
          author_name?: string
          category?: string
          comment_count?: number
          content: string
          created_at?: string
          disagree_count?: number
          display_order?: number
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          is_hot_take?: boolean
          is_visible?: boolean
          language?: string
          min_tier?: string
          post_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          agree_count?: number
          author_name?: string
          category?: string
          comment_count?: number
          content?: string
          created_at?: string
          disagree_count?: number
          display_order?: number
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          is_hot_take?: boolean
          is_visible?: boolean
          language?: string
          min_tier?: string
          post_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          chapter_id: string
          completed: boolean
          id: string
          last_read_at: string
          progress_percent: number
          user_id: string
        }
        Insert: {
          chapter_id: string
          completed?: boolean
          id?: string
          last_read_at?: string
          progress_percent?: number
          user_id: string
        }
        Update: {
          chapter_id?: string
          completed?: boolean
          id?: string
          last_read_at?: string
          progress_percent?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "book_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_links: {
        Row: {
          bg_color: string
          category: string
          created_at: string
          description: string
          display_order: number | null
          id: string
          is_visible: boolean
          logo: string
          name: string
          offer: string
          referral_link: string
          text_color: string
          updated_at: string
        }
        Insert: {
          bg_color?: string
          category: string
          created_at?: string
          description: string
          display_order?: number | null
          id?: string
          is_visible?: boolean
          logo: string
          name: string
          offer: string
          referral_link: string
          text_color?: string
          updated_at?: string
        }
        Update: {
          bg_color?: string
          category?: string
          created_at?: string
          description?: string
          display_order?: number | null
          id?: string
          is_visible?: boolean
          logo?: string
          name?: string
          offer?: string
          referral_link?: string
          text_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      short_urls: {
        Row: {
          click_count: number
          created_at: string
          id: string
          original_url: string
          short_code: string
          updated_at: string
        }
        Insert: {
          click_count?: number
          created_at?: string
          id?: string
          original_url: string
          short_code: string
          updated_at?: string
        }
        Update: {
          click_count?: number
          created_at?: string
          id?: string
          original_url?: string
          short_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_indexed_content: {
        Row: {
          content: string
          created_at: string
          headings: string[] | null
          id: string
          keywords: string[] | null
          last_indexed_at: string
          page_description: string | null
          page_path: string
          page_title: string
        }
        Insert: {
          content: string
          created_at?: string
          headings?: string[] | null
          id?: string
          keywords?: string[] | null
          last_indexed_at?: string
          page_description?: string | null
          page_path: string
          page_title: string
        }
        Update: {
          content?: string
          created_at?: string
          headings?: string[] | null
          id?: string
          keywords?: string[] | null
          last_indexed_at?: string
          page_description?: string | null
          page_path?: string
          page_title?: string
        }
        Relationships: []
      }
      site_indexing_status: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          indexed_by: string | null
          last_indexed_at: string | null
          status: string | null
          total_pages_indexed: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          indexed_by?: string | null
          last_indexed_at?: string | null
          status?: string | null
          total_pages_indexed?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          indexed_by?: string | null
          last_indexed_at?: string | null
          status?: string | null
          total_pages_indexed?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          category: string
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      youtube_subscriptions: {
        Row: {
          amount: number
          created_at: string | null
          display_order: number | null
          email: string | null
          id: string
          is_visible: boolean
          last_reset_date: string | null
          member_since: string | null
          name: string
          notes: string | null
          payment_date: string | null
          payment_history: Json | null
          payment_month: string | null
          payment_screenshot_url: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string | null
          slot_number: number | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          display_order?: number | null
          email?: string | null
          id?: string
          is_visible?: boolean
          last_reset_date?: string | null
          member_since?: string | null
          name: string
          notes?: string | null
          payment_date?: string | null
          payment_history?: Json | null
          payment_month?: string | null
          payment_screenshot_url?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          slot_number?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          display_order?: number | null
          email?: string | null
          id?: string
          is_visible?: boolean
          last_reset_date?: string | null
          member_since?: string | null
          name?: string
          notes?: string | null
          payment_date?: string | null
          payment_history?: Json | null
          payment_month?: string | null
          payment_screenshot_url?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          slot_number?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      youtube_subscriptions_public: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string | null
          is_visible: boolean | null
          name: string | null
          payment_month: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          slot_number: number | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string | null
          is_visible?: boolean | null
          name?: string | null
          payment_month?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          slot_number?: number | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string | null
          is_visible?: boolean | null
          name?: string | null
          payment_month?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          slot_number?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_public_app_settings: {
        Args: never
        Returns: {
          key: string
          scope: string
          value: Json
        }[]
      }
      get_public_site_settings: {
        Args: never
        Returns: {
          category: string
          key: string
          value: string
        }[]
      }
      get_public_supporters: {
        Args: never
        Returns: {
          amount: number
          created_at: string
          display_name: string
          id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_url_clicks: { Args: { url_code: string }; Returns: undefined }
      set_pov_reaction: {
        Args: { _post_id: string; _reaction_type: string; _visitor_id: string }
        Returns: undefined
      }
      tier_rank: { Args: { _tier: string }; Returns: number }
      user_tier: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      payment_status: "pending" | "paid" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      payment_status: ["pending", "paid", "failed"],
    },
  },
} as const
