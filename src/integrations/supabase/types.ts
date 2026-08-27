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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ac_analytics: {
        Row: {
          ac_id: string
          created_at: string | null
          id: string
          last_viewed_at: string | null
          view_count: number | null
        }
        Insert: {
          ac_id: string
          created_at?: string | null
          id?: string
          last_viewed_at?: string | null
          view_count?: number | null
        }
        Update: {
          ac_id?: string
          created_at?: string | null
          id?: string
          last_viewed_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ac_analytics_ac_id_fkey"
            columns: ["ac_id"]
            isOneToOne: true
            referencedRelation: "bihar_acs"
            referencedColumns: ["id"]
          },
        ]
      }
      ac_files: {
        Row: {
          ac_id: string
          created_at: string | null
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
        }
        Insert: {
          ac_id: string
          created_at?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
        }
        Update: {
          ac_id?: string
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ac_files_ac_id_fkey"
            columns: ["ac_id"]
            isOneToOne: false
            referencedRelation: "bihar_acs"
            referencedColumns: ["id"]
          },
        ]
      }
      ac_research: {
        Row: {
          ac_id: string
          category: string | null
          content: string | null
          created_at: string | null
          demographics: Json | null
          election_results: Json | null
          id: string
          issues_news: Json | null
          overview: string | null
          status: string | null
          title: string
          updated_at: string | null
          voter_dynamics: Json | null
        }
        Insert: {
          ac_id: string
          category?: string | null
          content?: string | null
          created_at?: string | null
          demographics?: Json | null
          election_results?: Json | null
          id?: string
          issues_news?: Json | null
          overview?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          voter_dynamics?: Json | null
        }
        Update: {
          ac_id?: string
          category?: string | null
          content?: string | null
          created_at?: string | null
          demographics?: Json | null
          election_results?: Json | null
          id?: string
          issues_news?: Json | null
          overview?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          voter_dynamics?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ac_research_ac_id_fkey"
            columns: ["ac_id"]
            isOneToOne: false
            referencedRelation: "bihar_acs"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "admin_chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_health_events: {
        Row: {
          agent: string | null
          context: Json | null
          created_at: string
          event_type: string
          id: string
          message: string | null
          severity: string
          source: string
          thread_id: string | null
          user_id: string | null
        }
        Insert: {
          agent?: string | null
          context?: Json | null
          created_at?: string
          event_type: string
          id?: string
          message?: string | null
          severity?: string
          source: string
          thread_id?: string | null
          user_id?: string | null
        }
        Update: {
          agent?: string | null
          context?: Json | null
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          severity?: string
          source?: string
          thread_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_suggested_changes: {
        Row: {
          change_type: string
          created_at: string | null
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          suggested_data: Json
          target_id: string | null
          target_name: string | null
        }
        Insert: {
          change_type: string
          created_at?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          suggested_data: Json
          target_id?: string | null
          target_name?: string | null
        }
        Update: {
          change_type?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          suggested_data?: Json
          target_id?: string | null
          target_name?: string | null
        }
        Relationships: []
      }
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
      analytics_daily_stats: {
        Row: {
          avg_session_duration: number | null
          bounce_count: number | null
          created_at: string
          date: string
          desktop_count: number | null
          direct_count: number | null
          id: string
          mobile_count: number | null
          new_visitors: number | null
          referral_count: number | null
          returning_visitors: number | null
          search_count: number | null
          social_count: number | null
          tablet_count: number | null
          total_page_views: number | null
          total_sessions: number | null
          total_visitors: number | null
          unique_visitors: number | null
          updated_at: string
        }
        Insert: {
          avg_session_duration?: number | null
          bounce_count?: number | null
          created_at?: string
          date: string
          desktop_count?: number | null
          direct_count?: number | null
          id?: string
          mobile_count?: number | null
          new_visitors?: number | null
          referral_count?: number | null
          returning_visitors?: number | null
          search_count?: number | null
          social_count?: number | null
          tablet_count?: number | null
          total_page_views?: number | null
          total_sessions?: number | null
          total_visitors?: number | null
          unique_visitors?: number | null
          updated_at?: string
        }
        Update: {
          avg_session_duration?: number | null
          bounce_count?: number | null
          created_at?: string
          date?: string
          desktop_count?: number | null
          direct_count?: number | null
          id?: string
          mobile_count?: number | null
          new_visitors?: number | null
          referral_count?: number | null
          returning_visitors?: number | null
          search_count?: number | null
          social_count?: number | null
          tablet_count?: number | null
          total_page_views?: number | null
          total_sessions?: number | null
          total_visitors?: number | null
          unique_visitors?: number | null
          updated_at?: string
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
      app_settings: {
        Row: {
          id: string
          key: string
          scope: string
          updated_at: string
          updated_by: string | null
          value: Json | null
        }
        Insert: {
          id?: string
          key: string
          scope: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
        }
        Update: {
          id?: string
          key?: string
          scope?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      bihar_acs: {
        Row: {
          ac_name: string
          ac_name_hindi: string | null
          ac_number: number
          created_at: string | null
          district: string | null
          geo_lat: number | null
          geo_lng: number | null
          has_research: boolean | null
          id: string
          last_winner_margin: number | null
          last_winner_name: string | null
          last_winner_party: string | null
          reservation: string | null
          slug: string
          total_electors: number | null
          updated_at: string | null
        }
        Insert: {
          ac_name: string
          ac_name_hindi?: string | null
          ac_number: number
          created_at?: string | null
          district?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          has_research?: boolean | null
          id?: string
          last_winner_margin?: number | null
          last_winner_name?: string | null
          last_winner_party?: string | null
          reservation?: string | null
          slug: string
          total_electors?: number | null
          updated_at?: string | null
        }
        Update: {
          ac_name?: string
          ac_name_hindi?: string | null
          ac_number?: number
          created_at?: string | null
          district?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          has_research?: boolean | null
          id?: string
          last_winner_margin?: number | null
          last_winner_name?: string | null
          last_winner_party?: string | null
          reservation?: string | null
          slug?: string
          total_electors?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      binod_conversations: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          last_message_at: string | null
          model: string
          project_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          last_message_at?: string | null
          model?: string
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          last_message_at?: string | null
          model?: string
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      binod_memories: {
        Row: {
          created_at: string
          id: string
          key: string
          scope: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          scope?: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          scope?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      binod_messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          followups: Json | null
          id: string
          parts: Json | null
          role: string
          steps: Json | null
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content?: string
          conversation_id: string
          created_at?: string
          followups?: Json | null
          id?: string
          parts?: Json | null
          role: string
          steps?: Json | null
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          followups?: Json | null
          id?: string
          parts?: Json | null
          role?: string
          steps?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      binod_pending_actions: {
        Row: {
          action_type: string
          approved_at: string | null
          conversation_id: string | null
          created_at: string
          executed_at: string | null
          id: string
          payload: Json
          result: Json | null
          status: string
          summary: string
          table_name: string
          user_id: string
        }
        Insert: {
          action_type: string
          approved_at?: string | null
          conversation_id?: string | null
          created_at?: string
          executed_at?: string | null
          id?: string
          payload: Json
          result?: Json | null
          status?: string
          summary: string
          table_name: string
          user_id: string
        }
        Update: {
          action_type?: string
          approved_at?: string | null
          conversation_id?: string | null
          created_at?: string
          executed_at?: string | null
          id?: string
          payload?: Json
          result?: Json | null
          status?: string
          summary?: string
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      binod_pinned: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      binod_projects: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          name: string
          system_prompt: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          system_prompt?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          system_prompt?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      candidates: {
        Row: {
          age: number | null
          bio: string | null
          constituency_id: string | null
          created_at: string | null
          gender: string | null
          id: string
          name: string
          party_id: string | null
          photo_url: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          bio?: string | null
          constituency_id?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string
          name: string
          party_id?: string | null
          photo_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          bio?: string | null
          constituency_id?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string
          name?: string
          party_id?: string | null
          photo_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_constituency_id_fkey"
            columns: ["constituency_id"]
            isOneToOne: false
            referencedRelation: "bihar_acs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "political_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_analytics: {
        Row: {
          avg_session_duration: number | null
          created_at: string
          date: string
          id: string
          total_duration_seconds: number | null
          total_sessions: number | null
          unique_visitors: number | null
        }
        Insert: {
          avg_session_duration?: number | null
          created_at?: string
          date: string
          id?: string
          total_duration_seconds?: number | null
          total_sessions?: number | null
          unique_visitors?: number | null
        }
        Update: {
          avg_session_duration?: number | null
          created_at?: string
          date?: string
          id?: string
          total_duration_seconds?: number | null
          total_sessions?: number | null
          unique_visitors?: number | null
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
      database_cells: {
        Row: {
          column_id: string
          id: string
          row_id: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          column_id: string
          id?: string
          row_id: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          column_id?: string
          id?: string
          row_id?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "database_cells_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "database_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "database_cells_row_id_fkey"
            columns: ["row_id"]
            isOneToOne: false
            referencedRelation: "database_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      database_columns: {
        Row: {
          created_at: string
          database_id: string
          id: string
          name: string
          options: Json | null
          order_index: number
          type: string
          updated_at: string
          width: number | null
        }
        Insert: {
          created_at?: string
          database_id: string
          id?: string
          name: string
          options?: Json | null
          order_index?: number
          type?: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          created_at?: string
          database_id?: string
          id?: string
          name?: string
          options?: Json | null
          order_index?: number
          type?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "database_columns_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
        ]
      }
      database_rows: {
        Row: {
          created_at: string
          database_id: string
          id: string
          order_index: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          database_id: string
          id?: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          database_id?: string
          id?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "database_rows_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
        ]
      }
      databases: {
        Row: {
          color: string | null
          created_at: string
          default_view: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          default_view?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          default_view?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      db_ai_conversations: {
        Row: {
          created_at: string
          database_id: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          database_id: string
          id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          database_id?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "db_ai_conversations_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
        ]
      }
      db_ai_messages: {
        Row: {
          attachments: Json
          content: string
          conversation_id: string
          created_at: string
          id: string
          plan: Json | null
          role: string
          status: string | null
        }
        Insert: {
          attachments?: Json
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          plan?: Json | null
          role: string
          status?: string | null
        }
        Update: {
          attachments?: Json
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          plan?: Json | null
          role?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "db_ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "db_ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      distrokid_accounts: {
        Row: {
          account_status: string | null
          account_status_date: string | null
          ai_filled: Json
          amount: number | null
          card_brand: string | null
          card_ending: string | null
          card_expiry: string | null
          card_holder: string | null
          card_number: string | null
          country: string | null
          created_at: string
          currency: string | null
          date_added: string
          email: string
          fts: unknown
          id: string
          lifetime_earning_usd: number
          nickname: string | null
          notes: string | null
          password_hint: string | null
          phone: string | null
          planned_date: string | null
          recovery_email: string | null
          remark: string | null
          signup_date: string | null
          status: string
          subscription_date: string | null
          subscription_plan: string | null
          subscription_status: string | null
          subscription_status_date: string | null
          tab: string
          tags: string[] | null
          time_added: string
          title: string | null
          two_factor_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          account_status?: string | null
          account_status_date?: string | null
          ai_filled?: Json
          amount?: number | null
          card_brand?: string | null
          card_ending?: string | null
          card_expiry?: string | null
          card_holder?: string | null
          card_number?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          date_added?: string
          email: string
          fts?: unknown
          id?: string
          lifetime_earning_usd?: number
          nickname?: string | null
          notes?: string | null
          password_hint?: string | null
          phone?: string | null
          planned_date?: string | null
          recovery_email?: string | null
          remark?: string | null
          signup_date?: string | null
          status?: string
          subscription_date?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          subscription_status_date?: string | null
          tab?: string
          tags?: string[] | null
          time_added?: string
          title?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          account_status?: string | null
          account_status_date?: string | null
          ai_filled?: Json
          amount?: number | null
          card_brand?: string | null
          card_ending?: string | null
          card_expiry?: string | null
          card_holder?: string | null
          card_number?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          date_added?: string
          email?: string
          fts?: unknown
          id?: string
          lifetime_earning_usd?: number
          nickname?: string | null
          notes?: string | null
          password_hint?: string | null
          phone?: string | null
          planned_date?: string | null
          recovery_email?: string | null
          remark?: string | null
          signup_date?: string | null
          status?: string
          subscription_date?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          subscription_status_date?: string | null
          tab?: string
          tags?: string[] | null
          time_added?: string
          title?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      distrokid_artists: {
        Row: {
          account_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distrokid_artists_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "distrokid_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      distrokid_earnings: {
        Row: {
          account_id: string
          amount_usd: number
          created_at: string
          id: string
          notes: string | null
          period_month: string | null
          recorded_date: string
          source: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amount_usd?: number
          created_at?: string
          id?: string
          notes?: string | null
          period_month?: string | null
          recorded_date?: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount_usd?: number
          created_at?: string
          id?: string
          notes?: string | null
          period_month?: string | null
          recorded_date?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distrokid_earnings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "distrokid_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      distrokid_guide_articles: {
        Row: {
          category_id: string | null
          content_md: string
          cover_icon: string | null
          created_at: string
          fts: unknown
          id: string
          last_edited_at: string
          slug: string
          sort_order: number
          status: string
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          category_id?: string | null
          content_md?: string
          cover_icon?: string | null
          created_at?: string
          fts?: unknown
          id?: string
          last_edited_at?: string
          slug: string
          sort_order?: number
          status?: string
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          category_id?: string | null
          content_md?: string
          cover_icon?: string | null
          created_at?: string
          fts?: unknown
          id?: string
          last_edited_at?: string
          slug?: string
          sort_order?: number
          status?: string
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "distrokid_guide_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "distrokid_guide_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      distrokid_guide_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      distrokid_ig_alerts: {
        Row: {
          created_at: string
          error: string | null
          id: string
          ig_audio_url: string | null
          kind: string
          provider_id: string | null
          release_id: string | null
          status: string
          to_email: string
          track_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          ig_audio_url?: string | null
          kind?: string
          provider_id?: string | null
          release_id?: string | null
          status?: string
          to_email: string
          track_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          ig_audio_url?: string | null
          kind?: string
          provider_id?: string | null
          release_id?: string | null
          status?: string
          to_email?: string
          track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distrokid_ig_alerts_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "distrokid_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distrokid_ig_alerts_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "distrokid_release_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      distrokid_ig_audio_checks: {
        Row: {
          checked_at: string
          created_at: string
          detected_title: string | null
          error: string | null
          http_status: number | null
          id: string
          latency_ms: number | null
          raw_signal: Json | null
          release_id: string
          status: string
          track_id: string | null
        }
        Insert: {
          checked_at?: string
          created_at?: string
          detected_title?: string | null
          error?: string | null
          http_status?: number | null
          id?: string
          latency_ms?: number | null
          raw_signal?: Json | null
          release_id: string
          status: string
          track_id?: string | null
        }
        Update: {
          checked_at?: string
          created_at?: string
          detected_title?: string | null
          error?: string | null
          http_status?: number | null
          id?: string
          latency_ms?: number | null
          raw_signal?: Json | null
          release_id?: string
          status?: string
          track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distrokid_ig_audio_checks_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "distrokid_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distrokid_ig_audio_checks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "distrokid_release_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      distrokid_release_earnings: {
        Row: {
          account_id: string
          amount_usd: number
          country_count: number | null
          created_at: string
          id: string
          notes: string | null
          period_month: string | null
          platform: string
          release_id: string
          reporting_date: string | null
          source: string
          units: number
          updated_at: string
        }
        Insert: {
          account_id: string
          amount_usd?: number
          country_count?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          period_month?: string | null
          platform: string
          release_id: string
          reporting_date?: string | null
          source?: string
          units?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount_usd?: number
          country_count?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          period_month?: string | null
          platform?: string
          release_id?: string
          reporting_date?: string | null
          source?: string
          units?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distrokid_release_earnings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "distrokid_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distrokid_release_earnings_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "distrokid_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      distrokid_release_tracks: {
        Row: {
          active_source: string | null
          active_source_url: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          ig_audio_id: string | null
          ig_audio_url: string | null
          ig_down_alert_sent_at: string | null
          ig_last_checked_at: string | null
          ig_last_live_at: string | null
          ig_live_status: string | null
          ig_next_check_at: string | null
          isrc: string | null
          passive_source: string | null
          passive_source_url: string | null
          position: number
          release_id: string
          title: string
          updated_at: string
        }
        Insert: {
          active_source?: string | null
          active_source_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          ig_audio_id?: string | null
          ig_audio_url?: string | null
          ig_down_alert_sent_at?: string | null
          ig_last_checked_at?: string | null
          ig_last_live_at?: string | null
          ig_live_status?: string | null
          ig_next_check_at?: string | null
          isrc?: string | null
          passive_source?: string | null
          passive_source_url?: string | null
          position?: number
          release_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          active_source?: string | null
          active_source_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          ig_audio_id?: string | null
          ig_audio_url?: string | null
          ig_down_alert_sent_at?: string | null
          ig_last_checked_at?: string | null
          ig_last_live_at?: string | null
          ig_live_status?: string | null
          ig_next_check_at?: string | null
          isrc?: string | null
          passive_source?: string | null
          passive_source_url?: string | null
          position?: number
          release_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distrokid_release_tracks_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "distrokid_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      distrokid_releases: {
        Row: {
          account_id: string
          active_source: string | null
          active_source_url: string | null
          album_uid: string | null
          apple_url: string | null
          artist_name: string | null
          artwork_storage_path: string | null
          color_tag: string | null
          composers: string | null
          copyright_line: string | null
          cover_url: string | null
          created_at: string
          expected_earning_usd: number | null
          explicit: boolean
          featured_artists: string | null
          fts: unknown
          genre: string | null
          id: string
          ig_audio_id: string | null
          ig_audio_url: string | null
          ig_check_enabled: boolean
          ig_down_alert_sent_at: string | null
          ig_last_checked_at: string | null
          ig_last_live_at: string | null
          ig_live_status: string
          ig_next_check_at: string | null
          isrcs: Json
          label: string | null
          language: string | null
          live_at: string | null
          lyricists: string | null
          notes: string | null
          passive_source: string | null
          passive_source_url: string | null
          phonogram_line: string | null
          platforms: string[]
          presave_url: string | null
          promo_budget_usd: number | null
          rejected_at: string | null
          rejection_remark: string | null
          release_date: string | null
          spotify_url: string | null
          status_override: string | null
          sub_genre: string | null
          submitted_at: string | null
          title: string
          track_audio_paths: Json | null
          track_audio_urls: Json | null
          track_durations: Json
          tracks: Json
          type: string | null
          upc: string | null
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          account_id: string
          active_source?: string | null
          active_source_url?: string | null
          album_uid?: string | null
          apple_url?: string | null
          artist_name?: string | null
          artwork_storage_path?: string | null
          color_tag?: string | null
          composers?: string | null
          copyright_line?: string | null
          cover_url?: string | null
          created_at?: string
          expected_earning_usd?: number | null
          explicit?: boolean
          featured_artists?: string | null
          fts?: unknown
          genre?: string | null
          id?: string
          ig_audio_id?: string | null
          ig_audio_url?: string | null
          ig_check_enabled?: boolean
          ig_down_alert_sent_at?: string | null
          ig_last_checked_at?: string | null
          ig_last_live_at?: string | null
          ig_live_status?: string
          ig_next_check_at?: string | null
          isrcs?: Json
          label?: string | null
          language?: string | null
          live_at?: string | null
          lyricists?: string | null
          notes?: string | null
          passive_source?: string | null
          passive_source_url?: string | null
          phonogram_line?: string | null
          platforms?: string[]
          presave_url?: string | null
          promo_budget_usd?: number | null
          rejected_at?: string | null
          rejection_remark?: string | null
          release_date?: string | null
          spotify_url?: string | null
          status_override?: string | null
          sub_genre?: string | null
          submitted_at?: string | null
          title: string
          track_audio_paths?: Json | null
          track_audio_urls?: Json | null
          track_durations?: Json
          tracks?: Json
          type?: string | null
          upc?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          account_id?: string
          active_source?: string | null
          active_source_url?: string | null
          album_uid?: string | null
          apple_url?: string | null
          artist_name?: string | null
          artwork_storage_path?: string | null
          color_tag?: string | null
          composers?: string | null
          copyright_line?: string | null
          cover_url?: string | null
          created_at?: string
          expected_earning_usd?: number | null
          explicit?: boolean
          featured_artists?: string | null
          fts?: unknown
          genre?: string | null
          id?: string
          ig_audio_id?: string | null
          ig_audio_url?: string | null
          ig_check_enabled?: boolean
          ig_down_alert_sent_at?: string | null
          ig_last_checked_at?: string | null
          ig_last_live_at?: string | null
          ig_live_status?: string
          ig_next_check_at?: string | null
          isrcs?: Json
          label?: string | null
          language?: string | null
          live_at?: string | null
          lyricists?: string | null
          notes?: string | null
          passive_source?: string | null
          passive_source_url?: string | null
          phonogram_line?: string | null
          platforms?: string[]
          presave_url?: string | null
          promo_budget_usd?: number | null
          rejected_at?: string | null
          rejection_remark?: string | null
          release_date?: string | null
          spotify_url?: string | null
          status_override?: string | null
          sub_genre?: string | null
          submitted_at?: string | null
          title?: string
          track_audio_paths?: Json | null
          track_audio_urls?: Json | null
          track_durations?: Json
          tracks?: Json
          type?: string | null
          upc?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distrokid_releases_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "distrokid_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      distrokid_withdrawals: {
        Row: {
          account_id: string
          amount_usd_received: number | null
          amount_usd_submitted: number
          conversion_rate: number | null
          created_at: string
          fee_usd: number
          fts: unknown
          id: string
          inr_amount: number | null
          notes: string | null
          received_date: string | null
          status: string
          submitted_at: string
          updated_at: string
          withholding_usd: number
        }
        Insert: {
          account_id: string
          amount_usd_received?: number | null
          amount_usd_submitted?: number
          conversion_rate?: number | null
          created_at?: string
          fee_usd?: number
          fts?: unknown
          id?: string
          inr_amount?: number | null
          notes?: string | null
          received_date?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          withholding_usd?: number
        }
        Update: {
          account_id?: string
          amount_usd_received?: number | null
          amount_usd_submitted?: number
          conversion_rate?: number | null
          created_at?: string
          fee_usd?: number
          fts?: unknown
          id?: string
          inr_amount?: number | null
          notes?: string | null
          received_date?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          withholding_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "distrokid_withdrawals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "distrokid_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      dk_activity_log: {
        Row: {
          action: string
          created_at: string
          diff: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          diff?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          diff?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      dk_analytics_layouts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          scope: string
          updated_at: string
          user_id: string
          widgets: Json
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          scope?: string
          updated_at?: string
          user_id: string
          widgets?: Json
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          scope?: string
          updated_at?: string
          user_id?: string
          widgets?: Json
        }
        Relationships: []
      }
      dk_export_history: {
        Row: {
          created_at: string
          file_name: string
          filters: Json
          format: string
          id: string
          row_counts: Json
          template_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          filters?: Json
          format: string
          id?: string
          row_counts?: Json
          template_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          filters?: Json
          format?: string
          id?: string
          row_counts?: Json
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dk_export_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "dk_export_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      dk_export_templates: {
        Row: {
          columns: Json
          created_at: string
          filters: Json
          format: string
          id: string
          include: Json
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          columns?: Json
          created_at?: string
          filters?: Json
          format?: string
          id?: string
          include?: Json
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          columns?: Json
          created_at?: string
          filters?: Json
          format?: string
          id?: string
          include?: Json
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dk_preferences: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
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
      election_access_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          session_token: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          session_token: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          session_token?: string
          status?: string | null
        }
        Relationships: []
      }
      heena_conversations: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          last_message_at: string | null
          model: string
          project_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          last_message_at?: string | null
          model?: string
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          last_message_at?: string | null
          model?: string
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heena_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "heena_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      heena_memories: {
        Row: {
          created_at: string
          id: string
          key: string
          scope: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          scope?: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          scope?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      heena_messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          followups: Json | null
          id: string
          parts: Json | null
          role: string
          steps: Json | null
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content?: string
          conversation_id: string
          created_at?: string
          followups?: Json | null
          id?: string
          parts?: Json | null
          role: string
          steps?: Json | null
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          followups?: Json | null
          id?: string
          parts?: Json | null
          role?: string
          steps?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heena_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "heena_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      heena_pending_actions: {
        Row: {
          action_type: string
          approved_at: string | null
          conversation_id: string | null
          created_at: string
          executed_at: string | null
          id: string
          payload: Json
          result: Json | null
          status: string
          summary: string
          table_name: string
          user_id: string
        }
        Insert: {
          action_type: string
          approved_at?: string | null
          conversation_id?: string | null
          created_at?: string
          executed_at?: string | null
          id?: string
          payload: Json
          result?: Json | null
          status?: string
          summary: string
          table_name: string
          user_id: string
        }
        Update: {
          action_type?: string
          approved_at?: string | null
          conversation_id?: string | null
          created_at?: string
          executed_at?: string | null
          id?: string
          payload?: Json
          result?: Json | null
          status?: string
          summary?: string
          table_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heena_pending_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "heena_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      heena_pinned: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heena_pinned_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "heena_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      heena_projects: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          name: string
          system_prompt: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          system_prompt?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          system_prompt?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      heena_reminders: {
        Row: {
          active: boolean
          cadence: string
          created_at: string
          id: string
          last_run_at: string | null
          next_run_at: string
          prompt: string
          result_thread_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          cadence: string
          created_at?: string
          id?: string
          last_run_at?: string | null
          next_run_at: string
          prompt: string
          result_thread_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          cadence?: string
          created_at?: string
          id?: string
          last_run_at?: string | null
          next_run_at?: string
          prompt?: string
          result_thread_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kodu_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json
          source_id: string
          source_table: string
        }
        Insert: {
          chunk_index?: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          source_id: string
          source_table: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          source_id?: string
          source_table?: string
        }
        Relationships: []
      }
      kodu_index_status: {
        Row: {
          chunk_count: number
          content_hash: string
          last_indexed_at: string
          source_id: string
          source_table: string
        }
        Insert: {
          chunk_count?: number
          content_hash: string
          last_indexed_at?: string
          source_id: string
          source_table: string
        }
        Update: {
          chunk_count?: number
          content_hash?: string
          last_indexed_at?: string
          source_id?: string
          source_table?: string
        }
        Relationships: []
      }
      kodu_memories: {
        Row: {
          agent: string
          content: string
          created_at: string
          id: string
          importance: number
          kind: string
          last_used_at: string | null
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent?: string
          content: string
          created_at?: string
          id?: string
          importance?: number
          kind?: string
          last_used_at?: string | null
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent?: string
          content?: string
          created_at?: string
          id?: string
          importance?: number
          kind?: string
          last_used_at?: string | null
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notebook_lm_chapters: {
        Row: {
          chapter_name: string
          chapter_number: number
          created_at: string | null
          display_order: number | null
          id: string
          is_visible: boolean | null
          notebook_lm_link: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          chapter_name: string
          chapter_number: number
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          notebook_lm_link?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          chapter_name?: string
          chapter_number?: number
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          notebook_lm_link?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notepad_chat_folders: {
        Row: {
          agent: string
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent?: string
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent?: string
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notepad_chat_messages: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          parts?: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          parts?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notepad_chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "notepad_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notepad_chat_threads: {
        Row: {
          agent: string
          created_at: string
          current_note_id: string | null
          folder_id: string | null
          id: string
          is_trashed: boolean
          title: string
          trashed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent?: string
          created_at?: string
          current_note_id?: string | null
          folder_id?: string | null
          id?: string
          is_trashed?: boolean
          title?: string
          trashed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent?: string
          created_at?: string
          current_note_id?: string | null
          folder_id?: string | null
          id?: string
          is_trashed?: boolean
          title?: string
          trashed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notepad_chat_threads_current_note_id_fkey"
            columns: ["current_note_id"]
            isOneToOne: false
            referencedRelation: "workspace_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notepad_chat_threads_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "notepad_chat_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_biography: {
        Row: {
          audio_url: string | null
          created_at: string
          description: string | null
          event_date: string
          id: string
          seq: number | null
          tags: string[]
          title: string
          transcript_status: string
          transcript_text: string | null
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          description?: string | null
          event_date: string
          id?: string
          seq?: number | null
          tags?: string[]
          title: string
          transcript_status?: string
          transcript_text?: string | null
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          id?: string
          seq?: number | null
          tags?: string[]
          title?: string
          transcript_status?: string
          transcript_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      personal_csv_files: {
        Row: {
          columns: Json
          created_at: string
          deleted_at: string | null
          id: string
          is_draft: boolean
          name: string
          rows: Json
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          columns?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_draft?: boolean
          name?: string
          rows?: Json
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          columns?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_draft?: boolean
          name?: string
          rows?: Json
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_csv_templates: {
        Row: {
          columns: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_builtin: boolean
          name: string
          sample_rows: Json
          updated_at: string
        }
        Insert: {
          columns?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_builtin?: boolean
          name: string
          sample_rows?: Json
          updated_at?: string
        }
        Update: {
          columns?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_builtin?: boolean
          name?: string
          sample_rows?: Json
          updated_at?: string
        }
        Relationships: []
      }
      personal_csv_versions: {
        Row: {
          columns: Json
          created_at: string
          file_id: string
          id: string
          name: string
          rows: Json
          user_id: string
        }
        Insert: {
          columns: Json
          created_at?: string
          file_id: string
          id?: string
          name: string
          rows: Json
          user_id: string
        }
        Update: {
          columns?: Json
          created_at?: string
          file_id?: string
          id?: string
          name?: string
          rows?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_csv_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "personal_csv_files"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_folders: {
        Row: {
          created_at: string
          display_order: number
          id: string
          kind: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          kind?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          kind?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "personal_folders"
            referencedColumns: ["id"]
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
      personal_note_versions: {
        Row: {
          content_snapshot: string
          created_at: string
          id: string
          note_id: string
          title_snapshot: string
        }
        Insert: {
          content_snapshot: string
          created_at?: string
          id?: string
          note_id: string
          title_snapshot: string
        }
        Update: {
          content_snapshot?: string
          created_at?: string
          id?: string
          note_id?: string
          title_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_note_versions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "personal_notes_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      personal_notes_v2: {
        Row: {
          archived_at: string | null
          blocks: Json | null
          content: string
          content_hash: string | null
          created_at: string
          folder_id: string | null
          id: string
          is_archived: boolean
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          blocks?: Json | null
          content?: string
          content_hash?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          is_archived?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          blocks?: Json | null
          content?: string
          content_hash?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          is_archived?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_notes_v2_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "personal_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_people: {
        Row: {
          category: string
          created_at: string
          dob: string | null
          gender: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          relation_with_gf: string | null
          relation_with_me: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          dob?: string | null
          gender?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          relation_with_gf?: string | null
          relation_with_me?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          dob?: string | null
          gender?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          relation_with_gf?: string | null
          relation_with_me?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      personal_stopwatch: {
        Row: {
          accumulated_ms: number
          id: string
          is_running: boolean
          started_at: string | null
          updated_at: string
        }
        Insert: {
          accumulated_ms?: number
          id?: string
          is_running?: boolean
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          accumulated_ms?: number
          id?: string
          is_running?: boolean
          started_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      personal_tasks: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_complete: boolean
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_complete?: boolean
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_complete?: boolean
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      personal_timers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          target_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          target_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          target_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      personal_todos: {
        Row: {
          archived_at: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          display_order: number
          due_date: string | null
          folder_id: string | null
          fts: unknown
          id: string
          priority: string
          rich_description: Json | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          due_date?: string | null
          folder_id?: string | null
          fts?: unknown
          id?: string
          priority?: string
          rich_description?: Json | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          due_date?: string | null
          folder_id?: string | null
          fts?: unknown
          id?: string
          priority?: string
          rich_description?: Json | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_todos_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "personal_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_unreplied: {
        Row: {
          created_at: string
          id: string
          message: string
          message_at: string
          replied: boolean
          replied_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          message_at?: string
          replied?: boolean
          replied_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          message_at?: string
          replied?: boolean
          replied_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      political_parties: {
        Row: {
          abbreviation: string
          color: string
          created_at: string | null
          full_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          abbreviation: string
          color: string
          created_at?: string | null
          full_name: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          abbreviation?: string
          color?: string
          created_at?: string | null
          full_name?: string
          id?: string
          updated_at?: string | null
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
          id: string
          is_featured: boolean
          is_hot_take: boolean
          is_visible: boolean
          language: string
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
          id?: string
          is_featured?: boolean
          is_hot_take?: boolean
          is_visible?: boolean
          language?: string
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
          id?: string
          is_featured?: boolean
          is_hot_take?: boolean
          is_visible?: boolean
          language?: string
          post_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pov_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pov_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "pov_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          confidence_score: number | null
          constituency_id: string
          created_at: string | null
          id: string
          predicted_margin: number | null
          predicted_winner: string
          reason: string | null
          updated_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          constituency_id: string
          created_at?: string | null
          id?: string
          predicted_margin?: number | null
          predicted_winner: string
          reason?: string | null
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          constituency_id?: string
          created_at?: string | null
          id?: string
          predicted_margin?: number | null
          predicted_winner?: string
          reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_constituency_id_fkey"
            columns: ["constituency_id"]
            isOneToOne: false
            referencedRelation: "bihar_acs"
            referencedColumns: ["id"]
          },
        ]
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
      result_expectations: {
        Row: {
          category: string
          color_class: string
          created_at: string
          display_order: number
          has_practical: boolean
          icon: string
          id: string
          practical_max: number
          scenarios: Json
          section_a_max: number
          section_b_max: number
          section_c_max: number
          subject: string
          theory_max: number
          updated_at: string
        }
        Insert: {
          category: string
          color_class?: string
          created_at?: string
          display_order?: number
          has_practical?: boolean
          icon?: string
          id?: string
          practical_max?: number
          scenarios?: Json
          section_a_max?: number
          section_b_max?: number
          section_c_max?: number
          subject: string
          theory_max?: number
          updated_at?: string
        }
        Update: {
          category?: string
          color_class?: string
          created_at?: string
          display_order?: number
          has_practical?: boolean
          icon?: string
          id?: string
          practical_max?: number
          scenarios?: Json
          section_a_max?: number
          section_b_max?: number
          section_c_max?: number
          subject?: string
          theory_max?: number
          updated_at?: string
        }
        Relationships: []
      }
      result_leads: {
        Row: {
          created_at: string | null
          id: string
          name: string
          roll_number: string
          source: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          roll_number: string
          source?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          roll_number?: string
          source?: string | null
        }
        Relationships: []
      }
      results: {
        Row: {
          constituency_id: string
          created_at: string | null
          id: string
          margin: number | null
          party_id: string | null
          runner_up_candidate: string | null
          total_votes: number | null
          updated_at: string | null
          winner_candidate_id: string | null
          winner_votes: number | null
          year: number
        }
        Insert: {
          constituency_id: string
          created_at?: string | null
          id?: string
          margin?: number | null
          party_id?: string | null
          runner_up_candidate?: string | null
          total_votes?: number | null
          updated_at?: string | null
          winner_candidate_id?: string | null
          winner_votes?: number | null
          year: number
        }
        Update: {
          constituency_id?: string
          created_at?: string | null
          id?: string
          margin?: number | null
          party_id?: string | null
          runner_up_candidate?: string | null
          total_votes?: number | null
          updated_at?: string | null
          winner_candidate_id?: string | null
          winner_votes?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "results_constituency_id_fkey"
            columns: ["constituency_id"]
            isOneToOne: false
            referencedRelation: "bihar_acs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "political_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_winner_candidate_id_fkey"
            columns: ["winner_candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
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
      syllabus_chapters: {
        Row: {
          chapter_name: string
          chapter_name_hindi: string | null
          chapter_number: number
          created_at: string | null
          display_order: number | null
          id: string
          subject_id: string | null
        }
        Insert: {
          chapter_name: string
          chapter_name_hindi?: string | null
          chapter_number: number
          created_at?: string | null
          display_order?: number | null
          id?: string
          subject_id?: string | null
        }
        Update: {
          chapter_name?: string
          chapter_name_hindi?: string | null
          chapter_number?: number
          created_at?: string | null
          display_order?: number | null
          id?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "syllabus_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      syllabus_progress: {
        Row: {
          chapter_id: string | null
          id: string
          mcqs: boolean | null
          notes: string | null
          one_shot_video: boolean | null
          practice_problems: boolean | null
          pyqs: boolean | null
          student_id: string | null
          subjective_questions: boolean | null
          updated_at: string | null
        }
        Insert: {
          chapter_id?: string | null
          id?: string
          mcqs?: boolean | null
          notes?: string | null
          one_shot_video?: boolean | null
          practice_problems?: boolean | null
          pyqs?: boolean | null
          student_id?: string | null
          subjective_questions?: boolean | null
          updated_at?: string | null
        }
        Update: {
          chapter_id?: string | null
          id?: string
          mcqs?: boolean | null
          notes?: string | null
          one_shot_video?: boolean | null
          practice_problems?: boolean | null
          pyqs?: boolean | null
          student_id?: string | null
          subjective_questions?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "syllabus_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "syllabus_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "syllabus_students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      syllabus_students: {
        Row: {
          avatar_color: string | null
          created_at: string | null
          email: string
          id: string
          initials: string
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_color?: string | null
          created_at?: string | null
          email: string
          id?: string
          initials: string
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_color?: string | null
          created_at?: string | null
          email?: string
          id?: string
          initials?: string
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      syllabus_subjects: {
        Row: {
          category: string
          color: string | null
          created_at: string | null
          display_order: number | null
          icon: string | null
          id: string
          name: string
          name_hindi: string | null
        }
        Insert: {
          category: string
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
          name_hindi?: string | null
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
          name_hindi?: string | null
        }
        Relationships: []
      }
      trash_bin: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          id: string
          label: string
          payload: Json
          preview: string | null
          related: Json | null
          scope: string
          source: string
          source_id: string
          source_table: string
          user_id: string
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          label: string
          payload: Json
          preview?: string | null
          related?: Json | null
          scope?: string
          source: string
          source_id: string
          source_table: string
          user_id: string
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          label?: string
          payload?: Json
          preview?: string | null
          related?: Json | null
          scope?: string
          source?: string
          source_id?: string
          source_table?: string
          user_id?: string
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
      workspace_activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      workspace_ai_folders: {
        Row: {
          color: string | null
          created_at: string
          emoji: string | null
          id: string
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      workspace_ai_memories: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          kind?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_ai_messages: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string
          id: string
          metadata: Json | null
          parts: Json | null
          role: string
          steps: Json | null
          thread_id: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          parts?: Json | null
          role: string
          steps?: Json | null
          thread_id: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          parts?: Json | null
          role?: string
          steps?: Json | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_ai_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "workspace_ai_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_ai_pending: {
        Row: {
          action_type: string
          created_at: string
          id: string
          message_id: string | null
          payload: Json
          result: Json | null
          status: string
          summary: string
          table_name: string | null
          thread_id: string
          tool_call_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          message_id?: string | null
          payload?: Json
          result?: Json | null
          status?: string
          summary?: string
          table_name?: string | null
          thread_id: string
          tool_call_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          message_id?: string | null
          payload?: Json
          result?: Json | null
          status?: string
          summary?: string
          table_name?: string | null
          thread_id?: string
          tool_call_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_ai_pending_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "workspace_ai_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_ai_pending_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "workspace_ai_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_ai_threads: {
        Row: {
          archived: boolean
          branched_from_message_id: string | null
          branched_from_thread_id: string | null
          created_at: string
          folder_id: string | null
          id: string
          last_message_at: string | null
          model: string
          pinned: boolean
          title: string
          title_auto: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          branched_from_message_id?: string | null
          branched_from_thread_id?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          last_message_at?: string | null
          model?: string
          pinned?: boolean
          title?: string
          title_auto?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          branched_from_message_id?: string | null
          branched_from_thread_id?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          last_message_at?: string | null
          model?: string
          pinned?: boolean
          title?: string
          title_auto?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_ai_threads_branched_from_thread_id_fkey"
            columns: ["branched_from_thread_id"]
            isOneToOne: false
            referencedRelation: "workspace_ai_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_ai_threads_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "workspace_ai_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_note_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: string
          id: string
          note_id: string
          token_count: number | null
          user_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          embedding: string
          id?: string
          note_id: string
          token_count?: number | null
          user_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string
          id?: string
          note_id?: string
          token_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_note_chunks_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "workspace_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_note_index_status: {
        Row: {
          chunk_count: number
          content_hash: string
          last_indexed_at: string
          note_id: string
          user_id: string
        }
        Insert: {
          chunk_count?: number
          content_hash: string
          last_indexed_at?: string
          note_id: string
          user_id: string
        }
        Update: {
          chunk_count?: number
          content_hash?: string
          last_indexed_at?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_note_index_status_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: true
            referencedRelation: "workspace_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_note_versions: {
        Row: {
          content_snapshot: string
          created_at: string
          created_by: string | null
          id: string
          note_id: string
          rich_snapshot: Json | null
          source: string
          title_snapshot: string
        }
        Insert: {
          content_snapshot: string
          created_at?: string
          created_by?: string | null
          id?: string
          note_id: string
          rich_snapshot?: Json | null
          source?: string
          title_snapshot: string
        }
        Update: {
          content_snapshot?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note_id?: string
          rich_snapshot?: Json | null
          source?: string
          title_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_note_versions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "workspace_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_notes: {
        Row: {
          content: string
          cover_position: number
          cover_url: string | null
          created_at: string
          excerpt: string | null
          font_family: string
          fts: unknown
          full_width: boolean
          icon: string | null
          id: string
          is_archived: boolean
          is_locked: boolean
          is_trashed: boolean
          last_edited_at: string
          project_id: string | null
          rich_content: Json | null
          small_text: boolean
          sort_order: number
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          cover_position?: number
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          font_family?: string
          fts?: unknown
          full_width?: boolean
          icon?: string | null
          id?: string
          is_archived?: boolean
          is_locked?: boolean
          is_trashed?: boolean
          last_edited_at?: string
          project_id?: string | null
          rich_content?: Json | null
          small_text?: boolean
          sort_order?: number
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Update: {
          content?: string
          cover_position?: number
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          font_family?: string
          fts?: unknown
          full_width?: boolean
          icon?: string | null
          id?: string
          is_archived?: boolean
          is_locked?: boolean
          is_trashed?: boolean
          last_edited_at?: string
          project_id?: string | null
          rich_content?: Json | null
          small_text?: boolean
          sort_order?: number
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "workspace_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_projects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_archived: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
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
      syllabus_students_public: {
        Row: {
          avatar_color: string | null
          id: string | null
          initials: string | null
          name: string | null
          user_id: string | null
        }
        Insert: {
          avatar_color?: string | null
          id?: string | null
          initials?: string | null
          name?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_color?: string | null
          id?: string | null
          initials?: string | null
          name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      kodu_search_chunks: {
        Args: {
          match_count?: number
          query_embedding: string
          source_types?: string[]
        }
        Returns: {
          chunk_index: number
          content: string
          similarity: number
          source_id: string
          source_table: string
        }[]
      }
      kodu_search_fts: {
        Args: {
          match_count?: number
          query_text: string
          source_types?: string[]
        }
        Returns: {
          rank: number
          snippet: string
          source_id: string
          source_table: string
          title: string
        }[]
      }
      match_note_chunks: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          chunk_id: string
          chunk_index: number
          content: string
          note_id: string
          similarity: number
        }[]
      }
      set_pov_reaction: {
        Args: { _post_id: string; _reaction_type: string; _visitor_id: string }
        Returns: undefined
      }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
