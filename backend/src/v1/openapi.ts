export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'MyUrbanDaily Mobile & Web Unified API',
    version: '1.0.0',
    description: 'Enterprise API specification for iOS, Android, Web, and Admin Portal. Backed by Google Cloud Firestore as the single source of truth.',
    contact: {
      name: 'MyUrbanDaily Engineering',
      email: 'engineering@myurbandaily.com'
    }
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Primary API Gateway (Cloud Run / Local)'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Firebase Auth ID token or signed JWT'
      }
    },
    schemas: {
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 45 },
          totalPages: { type: 'integer', example: 3 }
        },
        required: ['page', 'limit', 'total', 'totalPages']
      },
      ApiSuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
          pagination: { $ref: '#/components/schemas/PaginationMeta' }
        },
        required: ['success', 'data']
      },
      ApiErrorDetail: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Invalid parameter provided' },
          details: { type: 'object' }
        },
        required: ['code', 'message']
      },
      ApiErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { $ref: '#/components/schemas/ApiErrorDetail' }
        },
        required: ['success', 'error']
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'bk_sgr_001' },
          booking_code: { type: 'string', example: 'MUD-SGR-001' },
          customer_id: { type: 'string', example: 'usr-cust-01' },
          service_id: { type: 'string', example: 'srv-plumb-tap' },
          status: {
            type: 'string',
            enum: ['REQUESTED', 'PROVIDER_MATCHED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'SERVICE_IN_PROGRESS', 'COMPLETED', 'PAYMENT_CONFIRMED', 'REVIEWED', 'CANCELLED']
          },
          address_locality: { type: 'string', example: 'Gandhi Nagar' },
          address_text: { type: 'string', example: 'Door #14, Main Road, Sagara' },
          total_amount: { type: 'number', example: 512 },
          otp: { type: 'string', example: '4289' }
        }
      },
      Service: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'srv-plumb-tap' },
          category_id: { type: 'string', example: 'cat-plumbing' },
          name: { type: 'string', example: 'Tap / Mixer Repair' },
          base_price: { type: 'number', example: 349 },
          unit: { type: 'string', example: 'per tap' },
          is_active: { type: 'boolean', example: true }
        }
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cat-plumbing' },
          slug: { type: 'string', example: 'plumbing' },
          name: { type: 'string', example: 'Plumbing Services' },
          icon: { type: 'string', example: 'Wrench' },
          base_inspection_fee: { type: 'number', example: 149 },
          is_active: { type: 'boolean', example: true }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'API Health Check',
        responses: {
          '200': {
            description: 'API is healthy and Firestore is connected',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          }
        }
      }
    },
    '/auth/verify-token': {
      post: {
        summary: 'Verify Firebase Auth ID Token (Mobile & Web Phone OTP / Google Sign-In)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  idToken: { type: 'string', description: 'Firebase Auth ID token (or send as Bearer in Authorization header)' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Token verified successfully. Returns user profile, current role, and claims.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          },
          '401': {
            description: 'Invalid or expired Firebase ID token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/auth/set-role': {
      post: {
        summary: 'Set Custom Claims on Firebase User (Admin/Ops gated)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  target_uid: { type: 'string', example: 'usr-tech-01' },
                  role: { type: 'string', enum: ['customer', 'technician', 'admin', 'ops', 'support'] }
                },
                required: ['target_uid', 'role']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Custom claims assigned successfully in Firebase Auth and synced to Cloud Firestore',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          },
          '403': {
            description: 'Access denied: requires admin or ops role'
          }
        }
      }
    },
    '/auth/me': {
      get: {
        summary: 'Get Authenticated User Profile & Custom Claims',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile with verified claims',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate User / Provider',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  phone: { type: 'string', example: '+919880011223' },
                  role: { type: 'string', enum: ['customer', 'provider', 'admin'] }
                },
                required: ['phone']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          }
        }
      }
    },
    '/catalog/categories': {
      get: {
        summary: 'List Service Categories',
        responses: {
          '200': {
            description: 'List of active categories',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          }
        }
      }
    },
    '/catalog/services': {
      get: {
        summary: 'List Services with Pagination',
        parameters: [
          { name: 'category_id', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Paginated services list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          }
        }
      }
    },
    '/bookings': {
      get: {
        summary: 'List Bookings with Pagination and Filters',
        parameters: [
          { name: 'customer_id', in: 'query', schema: { type: 'string' } },
          { name: 'provider_id', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          '200': {
            description: 'Paginated bookings list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create New Booking',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  customer_id: { type: 'string' },
                  service_id: { type: 'string' },
                  address_locality: { type: 'string' },
                  address_text: { type: 'string' },
                  address_lat: { type: 'number' },
                  address_lng: { type: 'number' },
                  scheduled_type: { type: 'string', enum: ['instant', 'scheduled'] }
                },
                required: ['customer_id', 'service_id', 'address_locality', 'address_text']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Booking created and written to Cloud Firestore',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          }
        }
      }
    },
    '/bookings/{id}': {
      get: {
        summary: 'Get Booking Details',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Booking details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          },
          '404': {
            description: 'Booking not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/bookings/{id}/accept': {
      post: {
        summary: 'Accept Booking (Technician)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  provider_id: { type: 'string' }
                },
                required: ['provider_id']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Booking accepted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          }
        }
      }
    },
    '/bookings/{id}/start-service': {
      post: {
        summary: 'Start Job Execution (Gated on Step 2 OTP and Step 3 Photos)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  provider_id: { type: 'string' },
                  otp: { type: 'string' }
                },
                required: ['provider_id']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Job started and status updated in Firestore',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          }
        }
      }
    },
    '/providers/availability': {
      put: {
        summary: 'Update Technician Online Duty Status and GPS Coordinates',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  provider_id: { type: 'string' },
                  is_online: { type: 'boolean' },
                  lat: { type: 'number' },
                  lng: { type: 'number' }
                },
                required: ['provider_id', 'is_online']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Duty status updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          }
        }
      }
    },
    '/billing/calculate': {
      post: {
        summary: 'Calculate Universal Billing Breakdown (Single Source of Truth)',
        description: 'Computes base labor, parts markup, 20% platform commission, 18% GST, and technician payout with integer paise precision.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  baseLaborRupees: { type: 'number', example: 499 },
                  partsMaterialsRupees: { type: 'number', example: 200 },
                  partsMarkupRate: { type: 'number', example: 0.10 },
                  discountRupees: { type: 'number', example: 50 }
                },
                required: ['baseLaborRupees']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Itemized calculation in integer paise and rupees',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          }
        }
      }
    },
    '/dispatch/available-jobs': {
      get: {
        summary: 'Server-Side Dispatch (Filter Jobs by Radius, Duty Status & Category)',
        parameters: [
          { name: 'provider_id', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'trade_category', in: 'query', schema: { type: 'string' } },
          { name: 'lat', in: 'query', schema: { type: 'number' } },
          { name: 'lng', in: 'query', schema: { type: 'number' } },
          { name: 'radius_km', in: 'query', schema: { type: 'number' } }
        ],
        responses: {
          '200': {
            description: 'Filtered eligible jobs within radius for online technician',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          }
        }
      }
    },
    '/bookings/{id}/verify-arrival': {
      post: {
        summary: 'ARRIVED -> IN_PROGRESS Doorstep Gate Verification',
        description: 'Server verifies: 1. Customer OTP (HMAC-SHA256, max 3 attempts) + 2. Geofence (150m) + 3. Cloud Storage photos (Selfie + Work site, < 30m old) + 4. Server-Side Biometric Face Match vs KYC (>= 75% passes, 50-74% manual review queue, < 50% rejected) + 5. Anti-spoofing (mock location and velocity jumps > 150 km/h rejected).',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  otp: { type: 'string', example: '4289' },
                  arrival_selfie_url: { type: 'string', example: 'https://storage.googleapis.com/.../selfie.jpg' },
                  worklocation_photo_url: { type: 'string', example: 'https://storage.googleapis.com/.../site.jpg' },
                  lat: { type: 'number', example: 14.1670 },
                  lng: { type: 'number', example: 75.0298 },
                  is_mock_location: { type: 'boolean', example: false }
                },
                required: ['otp', 'arrival_selfie_url', 'worklocation_photo_url']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Gate passed and status transitioned to SERVICE_IN_PROGRESS',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          },
          '400': {
            description: 'Gate verification failed (e.g. invalid OTP, missing photo, or outside geofence)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/payments/razorpay/create-order': {
      post: {
        summary: 'Create Razorpay Payment Order (Idempotent & Integer Paise)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  booking_id: { type: 'string' },
                  payment_method: { type: 'string', enum: ['upi', 'card', 'netbanking', 'cash_on_delivery'] },
                  idempotency_key: { type: 'string' }
                },
                required: ['booking_id']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Order created with integer paise amount and order ID',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          }
        }
      }
    },
    '/payments/razorpay/verify': {
      post: {
        summary: 'Verify Razorpay Signature & Activate Warranty',
        description: 'Cryptographically verifies HMAC-SHA256 signature, updates booking to PAYMENT_CONFIRMED, and idempotently issues receipt with 30-day warranty.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  order_id: { type: 'string' },
                  payment_id: { type: 'string' },
                  signature: { type: 'string' },
                  booking_id: { type: 'string' }
                },
                required: ['order_id', 'payment_id', 'signature']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Payment signature verified and receipt generated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          }
        }
      }
    },
    '/photos/signed-upload-url': {
      post: {
        summary: 'Generate Signed Cloud Storage Upload URL for Verification Photos',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  booking_id: { type: 'string' },
                  photo_type: { type: 'string', enum: ['selfie', 'worksite'] }
                },
                required: ['booking_id', 'photo_type']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Signed Cloud Storage path and upload metadata',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          }
        }
      }
    },
    '/payments/settlement': {
      post: {
        summary: 'Settle Cash or Bharat UPI QR Payment (Technician)',
        description: 'Settles payment for a completed booking. Cash payments require customer confirmation (customer_confirmed: true); unconfirmed cash is kept in pending_customer_confirmation. Bharat UPI QR payments are marked unverified pending bank reconciliation. All commission debits/credits are appended to an immutable Firestore settlement ledger.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  booking_id: { type: 'string' },
                  method: { type: 'string', enum: ['cash', 'upi_qr'] },
                  transaction_reference: { type: 'string' },
                  amount_paise: { type: 'number' },
                  customer_confirmed: { type: 'boolean', description: 'Mandatory confirmation for cash settlement' }
                },
                required: ['booking_id', 'method']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Payment settlement response with status (confirmed, pending_customer_confirmation, or unverified)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          }
        }
      }
    },
    '/admin/manual-reviews': {
      get: {
        summary: 'List Flagged Manual Reviews Queue (Admin/Ops gated)',
        description: 'Returns uncertain biometric face comparisons (score 50-74%) and anti-spoofing flags requiring manual ops investigation.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING_REVIEW', 'RESOLVED', 'REJECTED'] } }
        ],
        responses: {
          '200': {
            description: 'List of queued manual review records with pagination envelope',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessResponse' }
              }
            }
          },
          '403': {
            description: 'Access denied: requires admin or ops role'
          }
        }
      }
    }
  }
};
