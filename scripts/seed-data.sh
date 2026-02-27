#!/bin/bash
set -e

BFF_URL="${BFF_URL:-http://localhost:4000}"

echo "=== Seeding Car Repair ERP ==="
echo "BFF URL: $BFF_URL"
echo ""

# Wait for BFF to be ready
echo "Waiting for BFF to be ready..."
for i in $(seq 1 30); do
  if curl -sf "$BFF_URL/healthz" > /dev/null 2>&1; then
    echo "BFF is ready!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: BFF not ready after 30 seconds"
    exit 1
  fi
  sleep 1
done

echo ""
echo "--- Creating Customers ---"

CUST1=$(curl -sf -X POST "$BFF_URL/api/customers" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jan",
    "lastName": "Peeters",
    "email": "jan.peeters@example.be",
    "phone": "+32 476 12 34 56",
    "addressLine1": "Kerkstraat 42",
    "city": "Antwerpen",
    "postalCode": "2000",
    "country": "Belgium"
  }')
CUST1_ID=$(echo "$CUST1" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Created customer: Jan Peeters ($CUST1_ID)"

CUST2=$(curl -sf -X POST "$BFF_URL/api/customers" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Marie",
    "lastName": "Janssens",
    "email": "marie.janssens@example.be",
    "phone": "+32 485 98 76 54",
    "addressLine1": "Grote Markt 15",
    "city": "Brussel",
    "postalCode": "1000",
    "country": "Belgium",
    "companyName": "Janssens Transport NV",
    "vatNumber": "BE0123456789"
  }')
CUST2_ID=$(echo "$CUST2" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Created customer: Marie Janssens ($CUST2_ID)"

CUST3=$(curl -sf -X POST "$BFF_URL/api/customers" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Pieter",
    "lastName": "De Smedt",
    "email": "pieter.desmedt@example.be",
    "phone": "+32 499 11 22 33",
    "addressLine1": "Stationsstraat 7",
    "city": "Gent",
    "postalCode": "9000",
    "country": "Belgium"
  }')
CUST3_ID=$(echo "$CUST3" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Created customer: Pieter De Smedt ($CUST3_ID)"

echo ""
echo "--- Adding Vehicles ---"

VEH1=$(curl -sf -X POST "$BFF_URL/api/customers/$CUST1_ID/vehicles" \
  -H "Content-Type: application/json" \
  -d '{
    "make": "Volkswagen",
    "model": "Golf",
    "year": 2019,
    "vin": "WVWZZZ1KZAW123456",
    "licensePlate": "1-ABC-123",
    "mileageKm": 85000,
    "color": "Silver",
    "engineType": "diesel"
  }')
VEH1_ID=$(echo "$VEH1" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Added vehicle: VW Golf ($VEH1_ID)"

VEH2=$(curl -sf -X POST "$BFF_URL/api/customers/$CUST2_ID/vehicles" \
  -H "Content-Type: application/json" \
  -d '{
    "make": "BMW",
    "model": "3 Series",
    "year": 2021,
    "vin": "WBA8E9C50GK123456",
    "licensePlate": "1-XYZ-789",
    "mileageKm": 45000,
    "color": "Black",
    "engineType": "petrol"
  }')
VEH2_ID=$(echo "$VEH2" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Added vehicle: BMW 3 Series ($VEH2_ID)"

VEH3=$(curl -sf -X POST "$BFF_URL/api/customers/$CUST3_ID/vehicles" \
  -H "Content-Type: application/json" \
  -d '{
    "make": "Tesla",
    "model": "Model 3",
    "year": 2023,
    "vin": "5YJ3E1EA1PF123456",
    "licensePlate": "1-EV-001",
    "mileageKm": 15000,
    "color": "White",
    "engineType": "electric"
  }')
VEH3_ID=$(echo "$VEH3" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Added vehicle: Tesla Model 3 ($VEH3_ID)"

echo ""
echo "--- Creating Parts ---"

PART1=$(curl -sf -X POST "$BFF_URL/api/parts" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "OIL-5W30-5L",
    "name": "Engine Oil 5W-30 (5L)",
    "description": "Full synthetic engine oil",
    "category": "Oils & Fluids",
    "manufacturer": "Castrol",
    "unitPrice": {"amountCents": 4599, "currency": "EUR"},
    "costPrice": {"amountCents": 2800, "currency": "EUR"},
    "initialStock": 25,
    "reorderLevel": 5,
    "location": "A1-01",
    "compatibleMakes": ["Volkswagen", "BMW", "Audi", "Mercedes"]
  }')
PART1_ID=$(echo "$PART1" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Created part: Engine Oil ($PART1_ID)"

PART2=$(curl -sf -X POST "$BFF_URL/api/parts" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "FLT-OIL-VW",
    "name": "Oil Filter (VW/Audi)",
    "description": "OEM replacement oil filter",
    "category": "Filters",
    "manufacturer": "MANN-FILTER",
    "unitPrice": {"amountCents": 1299, "currency": "EUR"},
    "costPrice": {"amountCents": 650, "currency": "EUR"},
    "initialStock": 30,
    "reorderLevel": 10,
    "location": "B2-03",
    "compatibleMakes": ["Volkswagen", "Audi", "Skoda", "SEAT"]
  }')
PART2_ID=$(echo "$PART2" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Created part: Oil Filter ($PART2_ID)"

PART3=$(curl -sf -X POST "$BFF_URL/api/parts" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "BRK-PAD-FR-BMW",
    "name": "Front Brake Pads (BMW 3 Series)",
    "description": "Premium ceramic brake pads",
    "category": "Brakes",
    "manufacturer": "Brembo",
    "unitPrice": {"amountCents": 8999, "currency": "EUR"},
    "costPrice": {"amountCents": 5500, "currency": "EUR"},
    "initialStock": 8,
    "reorderLevel": 3,
    "location": "C1-02",
    "compatibleMakes": ["BMW"]
  }')
PART3_ID=$(echo "$PART3" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Created part: Brake Pads ($PART3_ID)"

PART4=$(curl -sf -X POST "$BFF_URL/api/parts" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "BAT-12V-70AH",
    "name": "Car Battery 12V 70Ah",
    "description": "Maintenance-free AGM battery",
    "category": "Electrical",
    "manufacturer": "Varta",
    "unitPrice": {"amountCents": 15999, "currency": "EUR"},
    "costPrice": {"amountCents": 9500, "currency": "EUR"},
    "initialStock": 3,
    "reorderLevel": 2,
    "location": "D1-01",
    "compatibleMakes": ["Volkswagen", "BMW", "Audi", "Mercedes", "Tesla"]
  }')
PART4_ID=$(echo "$PART4" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Created part: Battery ($PART4_ID)"

echo ""
echo "--- Creating Work Orders ---"

WO1=$(curl -sf -X POST "$BFF_URL/api/work-orders" \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"$CUST1_ID\",
    \"vehicleId\": \"$VEH1_ID\",
    \"description\": \"Full oil service - 80,000km maintenance\",
    \"assignedMechanic\": \"Tom Verhoeven\",
    \"notes\": \"Customer reports slight engine noise\"
  }")
WO1_ID=$(echo "$WO1" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Created work order: Oil Service ($WO1_ID)"

WO2=$(curl -sf -X POST "$BFF_URL/api/work-orders" \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"$CUST2_ID\",
    \"vehicleId\": \"$VEH2_ID\",
    \"description\": \"Front brake pad replacement\",
    \"assignedMechanic\": \"Kevin Maes\",
    \"notes\": \"Brake squeal reported during braking\"
  }")
WO2_ID=$(echo "$WO2" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Created work order: Brake Replacement ($WO2_ID)"

echo ""
echo "=== Seed Complete ==="
echo ""
echo "Created:"
echo "  3 customers with vehicles"
echo "  4 inventory parts"
echo "  2 work orders"
echo ""
echo "Customer IDs: $CUST1_ID, $CUST2_ID, $CUST3_ID"
echo "Part IDs: $PART1_ID, $PART2_ID, $PART3_ID, $PART4_ID"
echo "Work Order IDs: $WO1_ID, $WO2_ID"
