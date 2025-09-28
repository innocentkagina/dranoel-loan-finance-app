// Loan requests service - Now using real database APIs instead of mock data

export interface LoanRequest {
  id: string
  memberName: string
  memberEmail: string
  membershipNumber: string
  loanType: string
  requestedAmount: number
  purpose: string
  employmentStatus: string
  monthlyIncome: number
  requestedDate: string
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
  urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  documents: string[]
  guarantors?: string[]
  creditScore?: number
}

export interface DashboardStats {
  pendingRequests: number
  underReviewRequests: number
  approvedToday: number
  rejectedToday: number
  totalMembers: number
  avgProcessingTime: string
  approvalRate: string
  totalRequestsThisMonth: number
  totalAmountRequested: number
  totalAmountApproved: number
}

// Simple event emitter for data changes
type DataChangeListener = () => void
const dataChangeListeners: DataChangeListener[] = []

export class LoanRequestsService {
  // Subscribe to data changes
  static onDataChange(listener: DataChangeListener): () => void {
    dataChangeListeners.push(listener)

    // Return unsubscribe function
    return () => {
      const index = dataChangeListeners.indexOf(listener)
      if (index > -1) {
        dataChangeListeners.splice(index, 1)
      }
    }
  }

  // Notify all listeners of data changes
  private static notifyDataChange() {
    dataChangeListeners.forEach(listener => listener())
  }

  // Get all loan requests with optional filtering
  static async getLoanRequests(filters?: {
    status?: string
    loanType?: string
    search?: string
    page?: number
    limit?: number
  }): Promise<{ requests: LoanRequest[], total: number, pages: number }> {
    try {
      const params = new URLSearchParams()

      if (filters?.status) params.append('status', filters.status)
      if (filters?.loanType) {
        // Convert frontend filter value to database enum if needed
        const apiLoanType = this.convertFilterLoanTypeToEnum(filters.loanType)
        params.append('type', apiLoanType)
      }
      if (filters?.search) params.append('search', filters.search)
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())

      const response = await fetch(`/api/loan-applications?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch loan applications')
      }

      const data = await response.json()

      // Transform API response to match our interface
      const transformedRequests: LoanRequest[] = data.applications.map((app: any) => ({
        id: app.id,
        memberName: `${app.borrower.firstName} ${app.borrower.lastName}`,
        memberEmail: app.borrower.email,
        membershipNumber: app.applicationNumber, // Use application number as membership number
        loanType: this.mapDatabaseLoanType(app.loanType),
        requestedAmount: app.requestedAmount,
        purpose: app.purpose,
        employmentStatus: this.getEmploymentStatus(app),
        monthlyIncome: this.getMonthlyIncome(app),
        requestedDate: new Date(app.createdAt).toISOString().split('T')[0],
        status: this.mapDatabaseStatus(app.status),
        urgency: this.calculateUrgency(app),
        documents: app.documents.map((doc: any) => this.mapDocumentType(doc.type)),
        guarantors: [], // TODO: Implement guarantors from database
        creditScore: app.borrower.creditScore
      }))

      return {
        requests: transformedRequests,
        total: data.pagination.total,
        pages: data.pagination.pages
      }

    } catch (error) {
      console.error('Error fetching loan requests:', error)
      throw error
    }
  }

  // Get a specific loan request by ID
  static async getLoanRequestById(id: string): Promise<LoanRequest | null> {
    try {
      const response = await fetch(`/api/loan-applications/${id}`)

      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error('Failed to fetch loan application')
      }

      const app = await response.json()

      // Transform single application to our interface
      return {
        id: app.id,
        memberName: `${app.borrower.firstName} ${app.borrower.lastName}`,
        memberEmail: app.borrower.email,
        membershipNumber: app.applicationNumber,
        loanType: this.mapDatabaseLoanType(app.loanType),
        requestedAmount: app.requestedAmount,
        purpose: app.purpose,
        employmentStatus: this.getEmploymentStatus(app),
        monthlyIncome: this.getMonthlyIncome(app),
        requestedDate: new Date(app.createdAt).toISOString().split('T')[0],
        status: this.mapDatabaseStatus(app.status),
        urgency: this.calculateUrgency(app),
        documents: app.documents.map((doc: any) => this.mapDocumentType(doc.type)),
        guarantors: [], // TODO: Implement guarantors from database
        creditScore: app.borrower.creditScore
      }

    } catch (error) {
      console.error('Error fetching loan request by ID:', error)
      return null
    }
  }

  // Update loan request status
  static async updateLoanRequestStatus(
    id: string,
    status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED',
    comment?: string
  ): Promise<LoanRequest | null> {
    try {
      const action = status === 'APPROVED' ? 'approve' :
                    status === 'REJECTED' ? 'reject' :
                    'update'

      const body: any = { action }

      if (comment) {
        if (status === 'REJECTED') {
          body.rejectionReason = comment
        } else {
          body.officerNotes = comment
        }
      }

      // For approval, we might need additional fields
      if (status === 'APPROVED') {
        // Get the original application to calculate approval details
        const original = await this.getLoanRequestById(id)
        if (original) {
          body.approvedAmount = original.requestedAmount
          body.interestRate = 18.0 // Default rate, should be calculated based on credit score
          body.monthlyPayment = Math.round(original.requestedAmount * 0.052) // Rough calculation
        }
      }

      const response = await fetch(`/api/loan-applications/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error('Failed to update loan application status')
      }

      // Notify all listeners about the data change
      this.notifyDataChange()

      // Return the updated loan request
      return await this.getLoanRequestById(id)

    } catch (error) {
      console.error('Error updating loan request status:', error)
      throw error
    }
  }

  // Get dashboard statistics
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await fetch('/api/dashboard/stats')

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats')
      }

      const stats = await response.json()

      // API now returns the exact fields we need
      return {
        pendingRequests: stats.pendingRequests || 0,
        underReviewRequests: stats.underReviewRequests || 0,
        approvedToday: stats.approvedToday || 0,
        rejectedToday: stats.rejectedToday || 0,
        totalMembers: stats.totalMembers || 0,
        avgProcessingTime: stats.avgProcessingTime || '0 days',
        approvalRate: stats.approvalRate || '0%',
        totalRequestsThisMonth: stats.totalRequestsThisMonth || 0,
        totalAmountRequested: stats.totalAmountRequested || 0,
        totalAmountApproved: stats.totalAmountApproved || 0,
      }

    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      // Return default stats on error
      return {
        pendingRequests: 0,
        underReviewRequests: 0,
        approvedToday: 0,
        rejectedToday: 0,
        totalMembers: 0,
        avgProcessingTime: '0 days',
        approvalRate: '0%',
        totalRequestsThisMonth: 0,
        totalAmountRequested: 0,
        totalAmountApproved: 0,
      }
    }
  }

  // Get recent loan requests for dashboard
  static async getRecentLoanRequests(limit: number = 5): Promise<LoanRequest[]> {
    try {
      const response = await this.getLoanRequests({ limit, page: 1 })
      return response.requests
    } catch (error) {
      console.error('Error fetching recent loan requests:', error)
      return []
    }
  }

  // Add a new loan request (for when members submit applications)
  static async addLoanRequest(request: Omit<LoanRequest, 'id'>): Promise<LoanRequest> {
    try {
      const response = await fetch('/api/loan-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loanType: this.mapToApiLoanType(request.loanType),
          requestedAmount: request.requestedAmount,
          purpose: request.purpose,
          termMonths: 24, // Default term
          // Add other required fields
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create loan application')
      }

      const data = await response.json()

      // Notify listeners of data change
      this.notifyDataChange()

      // Return the created application
      return await this.getLoanRequestById(data.application.id) as LoanRequest

    } catch (error) {
      console.error('Error adding loan request:', error)
      throw error
    }
  }

  // Helper methods for data transformation

  private static convertFilterLoanTypeToEnum(filterType: string): string {
    // If it's already an enum value, return as is
    if (['PERSONAL', 'BUSINESS', 'STUDENT', 'MORTGAGE', 'AUTO', 'PAYDAY'].includes(filterType)) {
      return filterType
    }

    // Map display values to enum values for backward compatibility
    const typeMap: { [key: string]: string } = {
      'Personal Loan': 'PERSONAL',
      'Business Loan': 'BUSINESS',
      'Education Loan': 'STUDENT',
      'Mortgage Loan': 'MORTGAGE',
      'Auto Loan': 'AUTO'
    }
    return typeMap[filterType] || filterType
  }

  private static mapDatabaseLoanType(dbType: string): string {
    const typeMap: { [key: string]: string } = {
      'PERSONAL': 'Personal Loan',
      'BUSINESS': 'Business Loan',
      'STUDENT': 'Education Loan',
      'MORTGAGE': 'Mortgage Loan',
      'AUTO': 'Auto Loan'
    }
    return typeMap[dbType] || dbType
  }

  private static mapToApiLoanType(frontendType: string): string {
    const typeMap: { [key: string]: string } = {
      'Personal Loan': 'PERSONAL',
      'Business Loan': 'BUSINESS',
      'Education Loan': 'STUDENT',
      'Emergency Loan': 'PERSONAL',
      'Agriculture Loan': 'BUSINESS',
      'Mortgage Loan': 'MORTGAGE',
      'Auto Loan': 'AUTO'
    }
    return typeMap[frontendType] || 'PERSONAL'
  }

  private static mapDatabaseStatus(dbStatus: string): 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' {
    const statusMap: { [key: string]: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' } = {
      'DRAFT': 'PENDING',
      'SUBMITTED': 'PENDING',
      'UNDER_REVIEW': 'UNDER_REVIEW',
      'APPROVED': 'APPROVED',
      'REJECTED': 'REJECTED'
    }
    return statusMap[dbStatus] || 'PENDING'
  }

  private static mapDocumentType(dbDocType: string): string {
    const docMap: { [key: string]: string } = {
      'IDENTITY_PROOF': 'ID Copy',
      'INCOME_PROOF': 'Salary Slip',
      'BANK_STATEMENT': 'Bank Statement',
      'EMPLOYMENT_VERIFICATION': 'Employment Letter',
      'TAX_RETURN': 'Tax Returns',
      'COLLATERAL_DOCUMENT': 'Property Documents',
      'CREDIT_REPORT': 'Credit Report',
      'OTHER': 'Other Document'
    }
    return docMap[dbDocType] || 'Document'
  }

  private static calculateUrgency(app: any): 'HIGH' | 'MEDIUM' | 'LOW' {
    // Calculate urgency based on loan type and amount
    if (app.loanType === 'PERSONAL' && app.requestedAmount > 1000000) return 'HIGH'
    if (app.loanType === 'BUSINESS') return 'MEDIUM'
    return 'MEDIUM' // Default
  }

  private static getEmploymentStatus(app: any): string {
    if (app.employmentInfo && app.employmentInfo.employmentStatus) {
      return app.employmentInfo.employmentStatus
    }
    return app.borrower.employmentStatus || 'Unknown'
  }

  private static getMonthlyIncome(app: any): number {
    if (app.employmentInfo && app.employmentInfo.monthlyIncome) {
      return app.employmentInfo.monthlyIncome
    }
    return app.borrower.monthlyIncome || 0
  }

}