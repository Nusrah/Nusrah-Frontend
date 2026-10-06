import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss']
})
export class AdminDashboardComponent implements OnInit {
  activeTab: 'campaigns' | 'volunteers' = 'campaigns';
  mobileMenuOpen = false;

  showCreateCampaignForm = false;
  showCreateVolunteerForm = false;

  campaigns: any[] = [];
  pendingCampaigns: any[] = [];
  needsBankDetailsCampaigns: any[] = [];
  volunteers: any[] = [];
  pendingVolunteers: any[] = [];
  
  // Category options shown in the create-campaign dropdown and the
  // manage-campaign modal's category selector.
  categories: string[] = [
    'Masjid Construction',
    'Medical Aid',
    'Education',
    'Orphan Care',
    'Widow & Family Support',
    'Food & Ration Aid',
    'Water Wells',
    'Disaster Relief',
    'Qurbani / Udhiya',
    'Zakat & Sadaqah',
    'Islamic Da\'wah',
    'General / Other'
  ];

  newCampaign = {
    title: '',
    location: '',
    description: '',
    goal: 0,
    category: '',
    information: '',
    end_date: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_name: '',
    upi_id: ''
  };
  selectedFile: File | null = null;
  selectedQrCodeFile: File | null = null;
  selectedAdditionalFiles: File[] = [];
  selectedDocumentProofs: File[] = [];
  creatingCampaign = false;

  newVolunteer = { name: '', email: '', password: '', phone: '', city: '', bio: '', role: 'volunteer' };
  creatingVolunteer = false;

  // Modal State Controllers
  selectedCampaignModal: any = null;
  selectedVolunteerModal: any = null;

  campaignVolunteers: { [campaignId: string]: string[] } = {}; 

  imageModalUrl: string | null = null;
  imageModalTitle: string | null = null;

  campaignSearchQuery: string = '';
  campaignSortOrder: 'asc' | 'desc' = 'asc';

  volunteerSearchQuery: string = '';
  volunteerSortOrder: 'asc' | 'desc' = 'asc';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private router: Router) {}

  ngOnInit(): void {
    const profileJson = localStorage.getItem('user_profile');
    if (profileJson) {
      const profile = JSON.parse(profileJson);
      if (profile.role?.toLowerCase() !== 'admin') {
        alert('Access denied. Admins only.');
        this.router.navigate(['/']);
        return;
      }
    } else {
      alert('Please log in as an admin.');
      this.router.navigate(['/login']);
      return;
    }

    this.loadAdminData();
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/']);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  setActiveTab(tab: 'campaigns' | 'volunteers'): void {
    this.activeTab = tab;
    this.mobileMenuOpen = false;
  }

  loadAdminData(): void {
    this.http.get<any>('http://127.0.0.1:8000/api/admin/campaign-volunteers').subscribe({
      next: (mappingRes) => {
        const mappings = mappingRes.assignments || mappingRes.campaign_volunteers || mappingRes.mappings || mappingRes;
        this.campaignVolunteers = {};
        
        if (Array.isArray(mappings)) {
          mappings.forEach((m: any) => {
            const cId = m.campaign_id;
            const vId = m.volunteer_id;
            if (cId && vId) {
              if (!this.campaignVolunteers[cId]) {
                this.campaignVolunteers[cId] = [];
              }
              if (!this.campaignVolunteers[cId].includes(vId)) {
                this.campaignVolunteers[cId].push(vId);
              }
            }
          });
        }

        this.http.get<any>('http://127.0.0.1:8000/api/admin/campaigns').subscribe({
          next: (res) => {
            const allCampaigns = (res.campaigns || res).map((c: any) => {
              let parsedImages = c.additional_images;
              if (typeof parsedImages === 'string') {
                try {
                  parsedImages = JSON.parse(parsedImages);
                } catch (e) {
                  parsedImages = [];
                }
              }

              let parsedDocs = c.document_proofs;
              if (typeof parsedDocs === 'string') {
                try {
                  parsedDocs = JSON.parse(parsedDocs);
                } catch (e) {
                  parsedDocs = [];
                }
              }

              const mappedVols = this.campaignVolunteers[c.id] || c.volunteer_ids || [];

              return {
                ...c,
                additional_images: Array.isArray(parsedImages) ? parsedImages : [],
                document_proofs: Array.isArray(parsedDocs) ? parsedDocs : [],
                raised_input: c.raised ?? 0,
                assigned_volunteers_count: mappedVols.length,
                is_featured: !!c.is_featured,
                upi_qr_code_url: c.upi_qr_code_url || null
              };
            });

            this.pendingCampaigns = allCampaigns.filter((c: any) => 
              c.approval_status?.toLowerCase() === 'pending' || c.status?.toLowerCase() === 'pending'
            );
            this.needsBankDetailsCampaigns = allCampaigns.filter((c: any) =>
              c.status?.toLowerCase() === 'pending_bank_details'
            );
            this.campaigns = allCampaigns.filter((c: any) => 
              c.approval_status?.toLowerCase() !== 'pending' &&
              c.status?.toLowerCase() !== 'pending' &&
              c.status?.toLowerCase() !== 'pending_bank_details'
            );

            if (this.selectedCampaignModal) {
              const updated = this.campaigns.find(c => c.id === this.selectedCampaignModal.id) ||
                              this.pendingCampaigns.find(c => c.id === this.selectedCampaignModal.id) ||
                              this.needsBankDetailsCampaigns.find(c => c.id === this.selectedCampaignModal.id);
              if (updated) this.selectedCampaignModal = { ...updated };
            }

            this.cdr.detectChanges();
          },
          error: (err) => console.error('Error fetching admin campaigns', err)
        });
      },
      error: (err) => {
        console.error('Error fetching campaign-volunteer mappings', err);
      }
    });

    this.http.get<any>('http://127.0.0.1:8000/api/admin/volunteers').subscribe({
      next: (res) => {
        const allVolunteers = (res.volunteers || res).map((v: any) => ({
          ...v,
          name: v.name || v.full_name
        }));
        this.pendingVolunteers = allVolunteers.filter((v: any) => v.approval_status?.toLowerCase() === 'pending');
        this.volunteers = allVolunteers.filter((v: any) => v.approval_status?.toLowerCase() !== 'pending');

        if (this.selectedVolunteerModal) {
          const updated = this.volunteers.find(v => v.id === this.selectedVolunteerModal.id);
          if (updated) this.selectedVolunteerModal = { ...updated };
        }

        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching volunteers', err)
    });
  }

  openCampaignManageModal(campaign: any): void {
    this.selectedCampaignModal = { ...campaign, raised_input: campaign.raised ?? 0 };
  }

  closeCampaignManageModal(): void {
    this.selectedCampaignModal = null;
    this.loadAdminData();
  }

  openVolunteerManageModal(volunteer: any): void {
    this.selectedVolunteerModal = { ...volunteer, name: volunteer.name || volunteer.full_name };
  }

  closeVolunteerManageModal(): void {
    this.selectedVolunteerModal = null;
    this.loadAdminData();
  }

  calcPercentage(raised: number, goal: number): number {
    if (!goal || goal <= 0) return 0;
    const pct = ((raised || 0) / goal) * 100;
    return pct > 100 ? 100 : pct;
  }

  getCampaignAssignedVolunteers(campaignId: string): any[] {
    const assignedIds = this.campaignVolunteers[campaignId] || [];
    return this.volunteers.filter(v => assignedIds.includes(v.id));
  }

  getCampaignUnassignedVolunteers(campaignId: string): any[] {
    const assignedIds = this.campaignVolunteers[campaignId] || [];
    return this.volunteers.filter(v => !assignedIds.includes(v.id));
  }

  assignVolunteerToCampaignModal(campaignId: string, volunteerId: string): void {
    if (!this.campaignVolunteers[campaignId]) {
      this.campaignVolunteers[campaignId] = [];
    }
    if (!this.campaignVolunteers[campaignId].includes(volunteerId)) {
      this.campaignVolunteers[campaignId].push(volunteerId);
    }
  }

  unassignVolunteerFromCampaignModal(campaignId: string, volunteerId: string): void {
    if (this.campaignVolunteers[campaignId]) {
      this.campaignVolunteers[campaignId] = this.campaignVolunteers[campaignId].filter(id => id !== volunteerId);
    }
  }

  saveCampaignAssignments(campaignId: string): void {
    const assignedIds = this.campaignVolunteers[campaignId] || [];
    this.http.post(`http://127.0.0.1:8000/api/admin/campaigns/${campaignId}/assign-volunteers`, { volunteer_ids: assignedIds }).subscribe({
      next: () => {
        alert('Volunteer assignments updated successfully!');
        this.loadAdminData();
      },
      error: (err) => {
        console.error('Error saving volunteer assignments', err);
        alert('Failed to update assignments.');
      }
    });
  }

  getVolunteerAssignedCampaigns(volunteerId: string): any[] {
    const assigned: any[] = [];
    const allCamps = [...this.campaigns, ...this.pendingCampaigns, ...this.needsBankDetailsCampaigns];
    for (const cId in this.campaignVolunteers) {
      if (this.campaignVolunteers[cId]?.includes(volunteerId)) {
        const found = allCamps.find(c => c.id === cId);
        if (found && !assigned.some(a => a.id === found.id)) {
          assigned.push(found);
        }
      }
    }
    return assigned;
  }

  getVolunteerUnassignedCampaigns(volunteerId: string): any[] {
    const allCamps = [...this.campaigns, ...this.pendingCampaigns, ...this.needsBankDetailsCampaigns];
    const assignedCamps = this.getVolunteerAssignedCampaigns(volunteerId);
    const assignedIds = assignedCamps.map(c => c.id);
    return allCamps.filter(c => !assignedIds.includes(c.id));
  }

  assignCampaignToVolunteerModal(volunteerId: string, campaignId: string): void {
    if (!this.campaignVolunteers[campaignId]) {
      this.campaignVolunteers[campaignId] = [];
    }
    if (!this.campaignVolunteers[campaignId].includes(volunteerId)) {
      this.campaignVolunteers[campaignId].push(volunteerId);
    }
  }

  unassignCampaignFromVolunteerModal(volunteerId: string, campaignId: string): void {
    if (this.campaignVolunteers[campaignId]) {
      this.campaignVolunteers[campaignId] = this.campaignVolunteers[campaignId].filter(id => id !== volunteerId);
    }
  }

  saveVolunteerAssignments(volunteerId: string): void {
    const allCamps = [...this.campaigns, ...this.pendingCampaigns, ...this.needsBankDetailsCampaigns];
    let completedRequests = 0;
    let hasError = false;

    if (allCamps.length === 0) {
      alert('No campaigns available to update.');
      return;
    }

    allCamps.forEach((camp) => {
      const assignedIds = this.campaignVolunteers[camp.id] || [];
      this.http.post(`http://127.0.0.1:8000/api/admin/campaigns/${camp.id}/assign-volunteers`, { volunteer_ids: assignedIds }).subscribe({
        next: () => {
          completedRequests++;
          if (completedRequests === allCamps.length) {
            if (!hasError) {
              alert('Campaign assignments for volunteer updated successfully!');
              this.loadAdminData();
            }
          }
        },
        error: (err) => {
          hasError = true;
          completedRequests++;
          console.error(`Error updating assignments for campaign ${camp.id}`, err);
          if (completedRequests === allCamps.length) {
            alert('Failed to update some campaign assignments.');
            this.loadAdminData();
          }
        }
      });
    });
  }

  get featuredCampaignsCount(): number {
    return this.campaigns.filter(c => c.is_featured).length;
  }

  toggleFeaturedCampaign(camp: any, event?: any): void {
    const newState = event ? event.target.checked : !camp.is_featured;

    const payload = {
      ...camp,
      is_featured: newState
    };

    this.http.put(`http://127.0.0.1:8000/api/admin/campaigns/${camp.id}`, payload).subscribe({
      next: () => {
        camp.is_featured = newState;
        if (this.selectedCampaignModal && this.selectedCampaignModal.id === camp.id) {
          this.selectedCampaignModal.is_featured = newState;
        }
        alert(newState ? 'Campaign marked as featured successfully!' : 'Campaign removed from featured list.');
        this.loadAdminData();
      },
      error: (err) => {
        console.error('Error updating featured status', err);
        alert('Failed to update featured status.');
        if (event) event.target.checked = camp.is_featured;
      }
    });
  }

  get filteredCampaigns(): any[] {
    let result = [...this.campaigns];

    if (this.campaignSearchQuery && this.campaignSearchQuery.trim() !== '') {
      const query = this.campaignSearchQuery.toLowerCase().trim();
      result = result.filter(c => {
        const title = (c.title || '').toLowerCase();
        const location = (c.location || '').toLowerCase();
        const description = (c.description || '').toLowerCase();
        return title.includes(query) || location.includes(query) || description.includes(query);
      });
    }

    result.sort((a, b) => {
      const remainingA = (a.goal || 0) - (a.raised || 0);
      const remainingB = (b.goal || 0) - (b.raised || 0);

      if (this.campaignSortOrder === 'asc') {
        return remainingB - remainingA; 
      } else {
        return remainingA - remainingB; 
      }
    });

    return result;
  }

  get filteredVolunteers(): any[] {
    let result = [...this.volunteers];

    if (this.volunteerSearchQuery && this.volunteerSearchQuery.trim() !== '') {
      const query = this.volunteerSearchQuery.toLowerCase().trim();
      result = result.filter(v => {
        const name = (v.name || v.full_name || '').toLowerCase();
        const email = (v.email || '').toLowerCase();
        const city = (v.city || '').toLowerCase();
        const role = (v.role || '').toLowerCase();
        const bio = (v.bio || '').toLowerCase();
        return name.includes(query) || email.includes(query) || city.includes(query) || role.includes(query) || bio.includes(query);
      });
    }

    result.sort((a, b) => {
      const nameA = (a.name || a.full_name || '').toLowerCase();
      const nameB = (b.name || b.full_name || '').toLowerCase();
      if (this.volunteerSortOrder === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });

    return result;
  }

  approveVolunteer(id: string): void {
    this.http.put(`http://127.0.0.1:8000/api/admin/volunteers/${id}/approve`, {}).subscribe({
      next: () => {
        alert('Volunteer approved successfully!');
        this.loadAdminData();
      },
      error: (err) => {
        console.error('Error approving volunteer', err);
        alert('Failed to approve volunteer.');
      }
    });
  }

  rejectVolunteer(id: string): void {
    if (confirm('Are you sure you want to reject and remove this volunteer request?')) {
      this.pendingVolunteers = this.pendingVolunteers.filter(v => v.id !== id);
      this.cdr.detectChanges();
      alert('Volunteer request rejected.');

      this.http.delete(`http://127.0.0.1:8000/api/admin/volunteers/${id}`).subscribe({
        next: () => {},
        error: () => {}
      });
    }
  }

  approveCampaign(id: string): void {
    this.http.put<any>(`http://127.0.0.1:8000/api/admin/campaigns/${id}/approve`, {}).subscribe({
      next: (res) => {
        if (res?.status === 'pending_bank_details') {
          alert('Campaign approved — it will go live once bank details are added for it.');
        } else {
          alert('Campaign approved and published to donor feed!');
        }
        this.loadAdminData();
      },
      error: (err) => {
        console.error('Error approving campaign', err);
        alert('Failed to approve campaign.');
      }
    });
  }

  rejectCampaign(id: string): void {
    if (confirm('Are you sure you want to reject and remove this campaign request?')) {
      this.pendingCampaigns = this.pendingCampaigns.filter(c => c.id !== id);
      this.cdr.detectChanges();
      alert('Campaign request rejected.');

      this.http.delete(`http://127.0.0.1:8000/api/campaigns/${id}`).subscribe({
        next: () => {},
        error: () => {
          this.http.delete(`http://127.0.0.1:8000/api/admin/campaigns/${id}`).subscribe({
            next: () => {},
            error: () => {}
          });
        }
      });
    }
  }

  openImageModal(url: string, title?: string): void {
    this.imageModalUrl = url;
    this.imageModalTitle = title || 'Image Preview';
  }

  closeImageModal(): void {
    this.imageModalUrl = null;
    this.imageModalTitle = null;
  }

  deleteProgressImage(campaign: any, imageIndex: number): void {
    if (!confirm('Are you sure you want to delete this progress photo?')) return;

    const updatedImages = [...campaign.additional_images];
    updatedImages.splice(imageIndex, 1);

    const payload = {
      ...campaign,
      additional_images: updatedImages
    };

    this.http.put(`http://127.0.0.1:8000/api/admin/campaigns/${campaign.id}`, payload).subscribe({
      next: () => {
        campaign.additional_images = updatedImages;
        if (this.selectedCampaignModal) {
          this.selectedCampaignModal.additional_images = updatedImages;
        }
        alert('Progress photo deleted successfully!');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to delete image', err);
        alert('Could not delete image. Please try again.');
      }
    });
  }

  deleteDocumentProof(campaign: any, docIndex: number): void {
    if (!confirm('Are you sure you want to delete this document proof?')) return;

    const updatedDocs = [...campaign.document_proofs];
    updatedDocs.splice(docIndex, 1);

    const payload = {
      ...campaign,
      document_proofs: updatedDocs
    };

    this.http.put(`http://127.0.0.1:8000/api/admin/campaigns/${campaign.id}`, payload).subscribe({
      next: () => {
        campaign.document_proofs = updatedDocs;
        if (this.selectedCampaignModal) {
          this.selectedCampaignModal.document_proofs = updatedDocs;
        }
        alert('Document proof deleted successfully!');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to delete document', err);
        alert('Could not delete document. Please try again.');
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  onAdditionalFilesSelected(event: any): void {
    const files = event.target.files;
    if (files) {
      const remainingSlots = 10 - this.selectedAdditionalFiles.length;
      const filesToAdd = Array.from(files).slice(0, remainingSlots);
      this.selectedAdditionalFiles = [...this.selectedAdditionalFiles, ...filesToAdd] as File[];
    }
  }

  removeAdditionalFile(index: number): void {
    this.selectedAdditionalFiles.splice(index, 1);
  }

  onDocumentProofsSelected(event: any): void {
    const files = event.target.files;
    if (files) {
      const filesToAdd = Array.from(files) as File[];
      this.selectedDocumentProofs = [...this.selectedDocumentProofs, ...filesToAdd];
    }
  }

  removeDocumentProofFile(index: number): void {
    this.selectedDocumentProofs.splice(index, 1);
  }

  onCreateQrCodeSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedQrCodeFile = file;
    }
  }

  onPhotoUploadSelected(event: any, campaignId: string): void {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file, file.name);

      this.http.post(`http://127.0.0.1:8000/api/campaigns/${campaignId}/upload-photo`, formData).subscribe({
        next: () => {
          alert('Campaign cover photo updated successfully!');
          this.loadAdminData();
        },
        error: (err) => console.error('Failed to upload photo', err)
      });
    }
  }

  onQrCodeUploadSelected(event: any, campaignId: string): void {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file, file.name);

      this.http.post<any>(`http://127.0.0.1:8000/api/campaigns/${campaignId}/upload-qr-code`, formData).subscribe({
        next: (res) => {
          alert('UPI QR Code uploaded successfully!');
          if (res.upi_qr_code_url && this.selectedCampaignModal) {
            this.selectedCampaignModal.upi_qr_code_url = res.upi_qr_code_url;
          }
          this.loadAdminData();
        },
        error: (err) => {
          console.error('Failed to upload QR code', err);
          alert('Failed to upload QR code image.');
        }
      });
    }
  }

  onGalleryUploadSelected(event: any, campaignId: string): void {
    const files = event.target.files;
    if (files) {
      const formData = new FormData();
      Array.from(files).forEach((file: any) => {
        formData.append('files', file, file.name);
      });

      this.http.post(`http://127.0.0.1:8000/api/campaigns/${campaignId}/upload-gallery`, formData).subscribe({
        next: () => {
          alert('Gallery photos added successfully!');
          this.loadAdminData();
        },
        error: (err) => console.error('Failed to upload gallery images', err)
      });
    }
  }

  onDocumentUploadSelected(event: any, campaignId: string): void {
    const files = event.target.files;
    if (files) {
      const formData = new FormData();
      Array.from(files).forEach((file: any) => {
        formData.append('documents', file, file.name);
      });

      this.http.post(`http://127.0.0.1:8000/api/campaigns/${campaignId}/upload-documents`, formData).subscribe({
        next: () => {
          alert('PDF document proofs uploaded successfully!');
          this.loadAdminData();
        },
        error: (err) => console.error('Failed to upload documents', err)
      });
    }
  }

  createCampaign(): void {
    const profileJson = localStorage.getItem('user_profile');
    if (!profileJson) return;
    const profile = JSON.parse(profileJson);

    if (!this.selectedFile || !this.newCampaign.title || !this.newCampaign.goal) {
      alert('Please fill out all required campaign fields and select a primary image file.');
      return;
    }

    if (!this.newCampaign.category) {
      alert('Please select a category for this campaign.');
      return;
    }

    if (!this.newCampaign.information || !this.newCampaign.information.trim()) {
      alert('Please add the detailed campaign story/information — this is what donors see on the donate page.');
      return;
    }

    if (!this.newCampaign.end_date) {
      alert('Please set a campaign end date.');
      return;
    }

    this.creatingCampaign = true;
    const formData = new FormData();
    formData.append('title', this.newCampaign.title);
    formData.append('location', this.newCampaign.location);
    formData.append('description', this.newCampaign.description);
    formData.append('goal', this.newCampaign.goal.toString());
    formData.append('user_email', profile.email);
    formData.append('file', this.selectedFile, this.selectedFile.name);
    formData.append('category', this.newCampaign.category || '');
    formData.append('information', this.newCampaign.information || '');
    formData.append('end_date', this.newCampaign.end_date || '');
    formData.append('bank_account_name', this.newCampaign.bank_account_name || '');
    formData.append('bank_account_number', this.newCampaign.bank_account_number || '');
    formData.append('bank_ifsc_code', this.newCampaign.bank_ifsc_code || '');
    formData.append('bank_name', this.newCampaign.bank_name || '');
    formData.append('upi_id', this.newCampaign.upi_id || '');

    if (this.selectedQrCodeFile) {
      formData.append('upi_qr_code', this.selectedQrCodeFile, this.selectedQrCodeFile.name);
    }

    this.selectedAdditionalFiles.forEach((file) => {
      formData.append('additional_files', file, file.name);
    });

    this.selectedDocumentProofs.forEach((file) => {
      formData.append('verification_docs', file, file.name);
    });

    this.http.post('http://127.0.0.1:8000/api/campaigns', formData).subscribe({
      next: () => {
        this.creatingCampaign = false;
        alert('Campaign created successfully!');
        this.loadAdminData();
        this.newCampaign = {
          title: '', location: '', description: '', goal: 0, category: '',
          information: '', end_date: '', bank_account_name: '', bank_account_number: '',
          bank_ifsc_code: '', bank_name: '', upi_id: ''
        };
        this.selectedFile = null;
        this.selectedQrCodeFile = null;
        this.selectedAdditionalFiles = [];
        this.selectedDocumentProofs = [];
        this.showCreateCampaignForm = false;
      },
      error: (err) => {
        this.creatingCampaign = false;
        console.error('Error creating campaign', err);
        alert(err.error?.detail || 'Failed to create campaign.');
      }
    });
  }

  saveCampaignEdit(camp: any): void {
    this.http.put(`http://127.0.0.1:8000/api/admin/campaigns/${camp.id}`, camp).subscribe({
      next: () => {
        alert('Campaign updated successfully!');
        this.loadAdminData();
      },
      error: (err) => console.error('Error updating campaign', err)
    });
  }

  // Saves the category the moment it's picked from the dropdown, instead of
  // waiting for "Save Text Details" — a dropdown selection reads as a
  // committed choice, not a draft edit, so it should persist immediately.
  updateCampaignCategory(camp: any): void {
    this.http.put(`http://127.0.0.1:8000/api/admin/campaigns/${camp.id}`, { category: camp.category }).subscribe({
      next: () => {
        if (this.selectedCampaignModal && this.selectedCampaignModal.id === camp.id) {
          this.selectedCampaignModal.category = camp.category;
        }
        const cached = this.campaigns.find(c => c.id === camp.id) ||
          this.pendingCampaigns.find(c => c.id === camp.id) ||
          this.needsBankDetailsCampaigns.find(c => c.id === camp.id);
        if (cached) cached.category = camp.category;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating category', err);
        alert('Failed to update category. Please try again.');
      }
    });
  }

  saveCampaignBankDetails(camp: any): void {
    const payload = {
      bank_account_name: camp.bank_account_name,
      bank_account_number: camp.bank_account_number,
      bank_ifsc_code: camp.bank_ifsc_code,
      bank_name: camp.bank_name,
      upi_id: camp.upi_id,
      upi_qr_code_url: camp.upi_qr_code_url
    };
    this.http.put(`http://127.0.0.1:8000/api/admin/campaigns/${camp.id}`, payload).subscribe({
      next: () => {
        alert('Bank and UPI details updated successfully!');
        this.loadAdminData();
      },
      error: (err) => {
        console.error('Error updating bank details', err);
        alert('Failed to update bank details.');
      }
    });
  }

  deleteCampaignBankDetails(camp: any): void {
    if (!confirm('Are you sure you want to delete all bank and UPI details (including QR code) for this campaign?')) return;

    const payload = {
      bank_account_name: null,
      bank_account_number: null,
      bank_ifsc_code: null,
      bank_name: null,
      upi_id: null,
      upi_qr_code_url: null
    };

    this.http.put(`http://127.0.0.1:8000/api/admin/campaigns/${camp.id}`, payload).subscribe({
      next: () => {
        camp.bank_account_name = null;
        camp.bank_account_number = null;
        camp.bank_ifsc_code = null;
        camp.bank_name = null;
        camp.upi_id = null;
        camp.upi_qr_code_url = null;
        if (this.selectedCampaignModal && this.selectedCampaignModal.id === camp.id) {
          this.selectedCampaignModal.bank_account_name = null;
          this.selectedCampaignModal.bank_account_number = null;
          this.selectedCampaignModal.bank_ifsc_code = null;
          this.selectedCampaignModal.bank_name = null;
          this.selectedCampaignModal.upi_id = null;
          this.selectedCampaignModal.upi_qr_code_url = null;
        }
        alert('Bank and UPI details deleted successfully!');
        this.loadAdminData();
      },
      error: (err) => {
        console.error('Error deleting bank details', err);
        alert('Failed to delete bank details.');
      }
    });
  }

  updateCampaignFunds(camp: any): void {
    this.http.put(`http://127.0.0.1:8000/api/admin/campaigns/${camp.id}`, { raised: camp.raised_input }).subscribe({
      next: () => {
        alert('Raised funds updated successfully!');
        this.loadAdminData();
      },
      error: (err) => console.error('Error updating funds', err)
    });
  }

  deleteCampaign(id: string): void {
    if (confirm('Are you sure you want to delete this campaign?')) {
      this.http.delete(`http://127.0.0.1:8000/api/campaigns/${id}`).subscribe({
        next: () => this.loadAdminData(),
        error: (err) => console.error('Error deleting campaign', err)
      });
    }
  }

  createVolunteer(): void {
    if (!this.newVolunteer.name || !this.newVolunteer.email || !this.newVolunteer.password) {
      alert('Please fill out all required volunteer fields (Name, Email, Password).');
      return;
    }

    this.creatingVolunteer = true;
    this.http.post('http://127.0.0.1:8000/api/admin/volunteers', this.newVolunteer).subscribe({
      next: () => {
        this.creatingVolunteer = false;
        alert('Volunteer added successfully!');
        this.loadAdminData();
        this.newVolunteer = { name: '', email: '', password: '', phone: '', city: '', bio: '', role: 'volunteer' };
        this.showCreateVolunteerForm = false;
      },
      error: (err) => {
        this.creatingVolunteer = false;
        console.error('Error adding volunteer', err);
        alert(err.error?.detail || 'Failed to add volunteer.');
      }
    });
  }

  saveVolunteerEdit(vol: any): void {
    const payload = {
      ...vol,
      name: vol.name || vol.full_name
    };
    this.http.put(`http://127.0.0.1:8000/api/admin/volunteers/${vol.id}`, payload).subscribe({
      next: () => {
        alert('Volunteer updated successfully!');
        this.loadAdminData();
      },
      error: (err) => console.error('Error updating volunteer', err)
    });
  }

  deleteVolunteer(id: string): void {
    if (confirm('Are you sure you want to delete this volunteer?')) {
      this.http.delete(`http://127.0.0.1:8000/api/admin/volunteers/${id}`).subscribe({
        next: () => this.loadAdminData(),
        error: (err) => console.error('Error deleting volunteer', err)
      });
    }
  }
}