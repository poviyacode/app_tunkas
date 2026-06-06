import { ApplicationRef, Component, ComponentRef, ElementRef, HostListener, OnDestroy, PLATFORM_ID, ViewChild, ViewContainerRef, WritableSignal, effect, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser, isPlatformServer, Location, NgOptimizedImage } from '@angular/common';
import { Message, ReplyMessage } from '@interfaces/message';
import { Chat } from '@interfaces/chat';
import { User, UserCurrent, UserRole, UserVideoCallRequest } from '@interfaces/user';
import { PostMedia, PostMediaDetails } from '@interfaces/postMedia';
import { DialogService } from '@services/dialog.service';
import { AuthService } from '@services/auth.service';
import { MessageService } from '@services/message.service';
import { TipService } from '@services/tip.service';
import { SocketService } from '@services/socket.service';
import { ToastService } from '@services/toast.service';
import { SpinnerService } from '@services/spinner.service';
import { PostMediaService } from '@services/post-media.service';
import { TransactionCreditService } from '@services/transaction-credit.service';
import { ChatService } from '@services/chat.service';
import { NumericValidator, PricePostValidator } from '@core/common/custom-validators.ts';
import { Tools } from '@core/common/tools';
import { TranslateModule } from '@ngx-translate/core';
import { TipComponent } from '@shared/tip/tip.component';
import { first, Subject, Subscription, takeUntil } from 'rxjs';
import { PostService } from '@services/post.service';
import { CloudflareService } from '@services/cloudflare.service';
import { UserCreditService } from '@services/user-credit.service';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { environment } from '@environments/environment';
import { v4 as uuidv4 } from 'uuid';
import { Post } from '@interfaces/post';
import { UserService } from '@services/user.service';
import { SubscriptionService } from '@services/subscription.service';
import { CreditPurchaseComponent } from '@shared/credit-purchase/credit-purchase.component';
import { Title } from '@angular/platform-browser';
import { IconDirective } from '@directive/coin-svg.directive';
import { DateAgoPipe } from '@pipes/date-ago.pipe';
import { TruncatePipe } from '@pipes/truncate.pipe';
import { AutoResizeTextareaDirective } from '@directive/auto-resize-textarea.directive';
import { PushNotificationService } from '@services/push-notitication.service';
import { EmailService } from '@services/email.service';
import { ToolsService } from '@services/tools.service';
import { LiveStreamService } from '@services/live-stream.service';
import { JoinCallComponent } from '@shared/join-call/join-call.component';
import { DropdownMenuItem } from '@interfaces/tools';

@Component({
  selector: 'app-messages-chat',
  imports: [
    TranslateModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    IconDirective,
    DateAgoPipe,
    TruncatePipe,
    AutoResizeTextareaDirective
  ],
  animations: [
    trigger('flyInOut', [
      state('in', style({ transform: 'translateX(0) scale(1)', opacity: 1 })),
      transition('void => *', [
        style({ transform: 'translateX(0) scale(0.95)', opacity: 0 }),
        animate('400ms cubic-bezier(0.68, -0.55, 0.27, 1.55)', style({ transform: 'translateX(0) scale(1)', opacity: 1 }))
      ]),
      transition('* => void', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(0) scale(0.95)', opacity: 0 }))
      ]),
    ]),
    // 1. Animación suave para el contenedor principal (Fade in sutil)
    trigger('listAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms ease-out', style({ opacity: 1 }))
      ])
    ]),

    // 2. Animación fluida para la aparición y desaparición de mensajes individuales
    trigger('messageItemTrigger', [
      // Entrada del mensaje (Enviado o Recibido)
      transition(':enter', [
        style({
          opacity: 0,
          transform: 'translateY(12px) scale(0.98)',
          filter: 'blur(3px)'
        }),
        animate('350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({
            opacity: 1,
            transform: 'translateY(0) scale(1)',
            filter: 'blur(0)'
          })
        )
      ]),
      // Salida del mensaje (Cuando se elimina)
      transition(':leave', [
        animate('250ms cubic-bezier(0.25, 1, 0.5, 1)',
          style({
            opacity: 0,
            transform: 'scale(0.95)',
            filter: 'blur(4px)',
            height: 0,
            paddingTop: 0,
            paddingBottom: 0,
            marginBottom: 0
          })
        )
      ])
    ]),
  ],
  templateUrl: './messages-chat.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './messages-chat.component.scss'
})
export default class MessagesChatComponent {

  isBrowser: boolean;
  isServer: boolean;
  public isLoading = signal(true);
  maxSizeInMB = environment.maxSizeInMB;

  hasMore = true;
  totalPages = 0;
  currentPage = 0;
  limitPage = 20;

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('container', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private destroy$ = new Subject<void>();

  // scroll
  private isUserNearBottom = true;
  showScrollButton = false;
  private isUserScrolling = false; // Indica si el usuario está interactuando con el scroll
  private lastScrollTop = 0; // Guarda la última posición del scroll

  idChat: string | null;
  myform: FormGroup;
  myformMedia: FormGroup;
  reply: Message | null;

  typeViewArray = [
    { name: 'payment', value: 'PAYMENT' },
    { name: 'free', value: 'FREE' }
  ]

  filesArray: WritableSignal<PostMedia[]> = signal([]);
  selectedFiles: PostMedia[] = [];

  isTyping = signal(false);
  typingTimeout: any;

  currentDate: any;
  audio: HTMLAudioElement | null = null;

  // chat
  isSenderEmail = signal(false);
  messagesList: WritableSignal<Message[]> = signal([]);
  public activeMenu = signal<string | null>(null);

  // components
  private tipComponentRef: ComponentRef<TipComponent> | null = null;
  private creditPurchaseComponentRef: ComponentRef<CreditPurchaseComponent> | null = null;
  private joinCallComponentRef: ComponentRef<JoinCallComponent> | null = null;

  public dialogService = inject(DialogService);
  private activatedRoute = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  public authService = inject(AuthService);
  public userService = inject(UserService);
  private socketService = inject(SocketService);
  public messageService = inject(MessageService);
  private tipService = inject(TipService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private spinnerService = inject(SpinnerService);
  private postMediaService = inject(PostMediaService);
  private location = inject(Location);
  private cloudflareService = inject(CloudflareService);
  private transactionCreditService = inject(TransactionCreditService);
  public chatService = inject(ChatService);
  private platformId = inject(PLATFORM_ID);
  private postService = inject(PostService);
  public userCreditService = inject(UserCreditService);
  private title = inject(Title);
  private emailService = inject(EmailService);
  private toolsService = inject(ToolsService);
  private liveStreamService = inject(LiveStreamService);

  constructor() {
    this.title.setTitle('Messages');
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isServer = isPlatformServer(this.platformId);

    this.idChat = this.activatedRoute.snapshot.paramMap.get('idChat');
    this.messagesList = this.messageService.messages;
  }

  async ngOnInit() {
    if (this.isBrowser) {
      this.createFormControls();

      if (this.authService.user()) {
        // Primero cargamos los mensajes por HTTP
        await this.userChat();
      } else {
        this.router.navigate(['/chats']);
      }

    }
  }

  ngAfterViewInit(): void {

  }

  ngAfterViewChecked() {

  }

  ngOnDestroy() {
    if (this.isBrowser) {
      this.destroy$.next();
      this.destroy$.complete();

      this.detachSocketEvents();

      //components
      this.clearCreditPurchaseComponent();
      this.clearTipComponent();
    }
  }

  createFormControls() {
    this.myform = this.fb.group({
      message: [null, Validators.required],
      typeView: ['FREE'],
      credit: [0],
      isPreviewMedia: [false],
    });

    this.myformMedia = this.fb.group({
      fileImages: ['', [Validators.required]],
      message: ['', Validators.nullValidator],
      typeView: ['FREE', Validators.required],
      credit: [5, [Validators.required, PricePostValidator, NumericValidator]],
      isPreviewMedia: [false, Validators.nullValidator],
    });
  }

  // find chat 
  async userChat() {
    this.messageService.resetMessages();

    this.messageService.findByChat(this.idChat!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {

          if (this.currentPage === 0) {
            //this.totalPages = res.total;
          }

          this.currentDate = res!.currentDate;

          if (res!.Messages) {
            this.messageService.addMessages([...res!.Messages]);
          }

          this.userOnlineSocket();

        },
        error: (err) => {
          this.isLoading.set(false);
        },
        complete: () => {
          this.isLoading.set(false);
        }
      });
  }

  trackByMessage(index: number, item: any): string {
    return item._id || item.code || index.toString();
  }

  // socket
  userOnlineSocket() {

    if (!this.socketService.socket) {
      this.socketService.connect();
    }

    this.onUpdateToRead();

    this.socketService.onNewMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {

        const { message } = data;
        const currentMessages = this.messageService.messages();
        const exists = currentMessages.some(msg =>
          (message.code && msg.code === message.code) || msg._id === message._id
        );

        if (!exists) {
          this.messageService.addMessages([message, ...currentMessages]);
        } else {
          this.messageService.updateMessages(message.code, { _id: message._id });
        }

        if (this.idChat === message.Chat) {
          this.onUpdateToRead();
        }

        if (this.isUserNearBottom) {
          setTimeout(() => {
            if (this.messagesContainer && this.messagesContainer.nativeElement) {
              this.messagesContainer.nativeElement.scrollTop = 0;
            }
          }, 30);
        }

      });

    this.socketService.onMessageRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        const { chat } = data;

        if (this.idChat === chat._id) {

          const updatedMessages = this.messageService.messages().map(msg => {
            if (msg.status !== 'READ') {
              return { ...msg, status: 'READ' };
            }
            return msg;
          });

          this.messageService.addMessages(updatedMessages);
        }
      });

    this.socketService.onMessageDeleted()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data.deletedMessage) {
          this.messageService.removeMessages(data.deletedMessage._id!);
        }
      });

    this.socketService.onTypingStatusReceived()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        const { chatId, userId, isTyping } = data;
        if (chatId === this.idChat && userId === this.messageService.userReceiver()?._id) {
          this.isTyping.set(isTyping);
        }
      });

    this.socketService.socket.emit('request_initial_online_users');
  }

  detachSocketEvents() {
    if (this.socketService.socket) {
      const roomName = `chat_${this.idChat}`;
      this.socketService.leaveRoom(roomName, (res) => {
        if (res && res.status === 'left') {
          console.log('Socket left room:', res.room);
        }
      });
    }
  }

  // send message
  async onSubmit() {

    if (!this.userService.hasEnoughCredits()) {
      this.onCreditPurchase();
      return;
    }

    const formValues = this.myform.getRawValue();

    if (this.myform.valid && this.authService.user()! && this.idChat) {
      const createPostMedia: any = [];
      const sendData: any = {
        code: uuidv4(),
        filesArray: createPostMedia,
        Chat: this.chatService.chat()!._id,
        Sender: this.authService.user()!._id,
        Receiver: this.messageService.userReceiver()!._id,
        message: this.myform.value.message,
        status: 'SENT',
        Reply: this.reply,
        credit: this.myform.value.credit,
        typeView: this.myform.value.typeView,
        isPreviewMedia: this.myform.value.isPreviewMedia,
        PostMedia: createPostMedia,
        createdAt: new Date(),
      };

      this.onReplyDelete();

      this.myform.patchValue({
        message: null,
        typeView: 'FREE',
        credit: 0,
        isPreviewMedia: false,
      });

      const currentMessages = this.messageService.messages();
      const updatedMessages = [sendData, ...currentMessages];
      this.messageService.addMessages(updatedMessages);

      setTimeout(() => {
        this.isUserNearBottom = true;
        this.scrollToBottom();
      }, 60);

      await this.onSendMessage(sendData);

    }
  }

  // send message with video and images
  async onSubmitMedia() {

    this.dialogService.closeModal();

    if (!this.userService.hasEnoughCredits()) {
      this.onCreditPurchase();
      return;
    }

    const formValues = this.myformMedia.getRawValue();

    if (this.myformMedia.valid && this.authService.user()! && this.idChat) {

      this.spinnerService.start();

      const createPostMedia: any = [];

      const data: any = {
        code: uuidv4(),
        filesArray: createPostMedia,
        Chat: this.chatService.chat()!._id,
        Sender: this.authService.user()!._id,
        Receiver: this.messageService.userReceiver()!._id,
        message: this.myform.value.message,
        status: 'SENT',
        Reply: this.reply,
        credit: this.myform.value.credit,
        typeView: this.myform.value.typeView,
        isPreviewMedia: this.myform.value.isPreviewMedia,
        PostMedia: createPostMedia,
        createdAt: new Date(),
      };

      const uploadPromises = this.filesArray().map(async (item: any) => {
        try {
          const additionalObject: any = {
            type: item.file.type!.split('/')[0],
            extension: item.file.type!.split('/')[1],
          };
          if (item.file.type!.split('/')[0] == 'video') {
            const resVideo = await this.cloudflareService.uploadToVideoCloudflare(item.file);
            if (resVideo) {
              additionalObject.cloudflare = resVideo;
            }
          } else if (item.file.type!.split('/')[0] == 'image') {
            const resImage = await this.cloudflareService.uploadToImageCloudflare(item.file);
            if (resImage !== null) {
              additionalObject.cloudflare = resImage;
            }
          }

          if (additionalObject.cloudflare) {
            data.filesArray.push(additionalObject);
          }

        } catch (error) {
          this.spinnerService.close();
          this.toastService.start({ type: 'error', message: 'pleaseTryAgain' });
        }
      });

      Promise.all(uploadPromises).then(async () => {
        if (data.filesArray.length > 0) {

          this.spinnerService.close();

          const currentMessages = this.messageService.messages();
          const updatedMessages = [data, ...currentMessages];
          this.messageService.addMessages(updatedMessages);

          setTimeout(() => {
            this.isUserNearBottom = true;
            this.scrollToBottom();
          }, 60);

          await this.onSendMessage(data);

        } else {
          this.spinnerService.close();
          this.toastService.start({ type: 'error', message: 'pleaseTryAgain' });
        }

        this.onResetFormMedia();
      });

    }
  }

  // send messate
  async onSendMessage(data: any) {

    // update chat
    const chat: any = {
      _id: this.idChat!
    }
    const chatExist: Chat = this.chatService.chats().find(c => c!._id === chat._id)!;
    // eliminamos estos dos datos para no confundir al chat
    const updatedChat = { ...chat };
    updatedChat.Receiver = this.messageService.userReceiver();
    updatedChat.User = this.messageService.userReceiver();

    if (chatExist) {
      updatedChat.User.countCredit = updatedChat.User.countCredit || { current: 0 };
      updatedChat.User.countCredit.current = chatExist.User?.countCredit?.current || 0;
      this.chatService.updateChats(chat._id!, updatedChat);
    } else {
      const currentChats = this.chatService.chats();
      const updatedChats = [updatedChat, ...currentChats];
      this.chatService.addChats(updatedChats);
    }

    this.messageService.create(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res) {
            this.onSendEmail(res);
          }
        },
        error: (err) => {

        },
        complete: () => {

        }
      });
  }

  async onUpdateToRead() {

    const dataUpdate = {
      Chat: this.chatService.chat()!?._id,
      Receiver: this.authService.user()!._id,
      Sender: this.messageService.userReceiver()?._id,
    };

    this.messageService.updateToRead(dataUpdate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res) {

          }
        },
        error: (err) => {

        },
        complete: () => {

        }
      });
  }

  // delete reply
  onReplyDelete() {
    this.reply = null;
  }

  // message buy
  async onMessageBuy(item: Message) {

    if (this.authService.user()!) {
      this.spinnerService.start();
      const Message: Message = item;
      if (Number(Message.credit) <= Number(this.userCreditService.userCredit()!.current)) {
        const data = {
          creditAmount: Message.credit,
          type: 'MESSAGE',
          Receiver: this.messageService.userReceiver(),
          Message: Message._id
        };

        this.transactionCreditService.createTransfer(data)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res) => {
              if (res?.Message) {

                const messageIndex = this.messageService.messages().findIndex(message => message._id === Message._id);

                if (messageIndex !== -1) {
                  this.toastService.start({ type: 'success', message: 'purchaseSuccess' });
                  this.messageService.messages()[messageIndex].typeView = res?.Message?.typeView;
                }
                this.myform.patchValue({
                  amount: Number(1),
                });
              }

              this.spinnerService.close();

            },
            error: (err) => {
              this.spinnerService.close();
            },
            complete: () => {
              this.spinnerService.close();
            }
          });
      } else {
        this.onCreditPurchase();
        this.spinnerService.close();
      }
    }
  }

  onResetFormMedia() {
    this.filesArray.set([]);
    this.selectedFiles = [];
    this.myformMedia.reset();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  onFileChange(event: any) {
    if (this.filesArray().length <= 4 && event.target.files && event.target.files[0]) {
      const maxSizeInMB = this.maxSizeInMB;
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

      var i = Number(0);
      for (let file of event.target.files) {
        if (file.size >= maxSizeInBytes) {
          this.toastService.start({ type: 'error', message: `fileTooLarge` });
          return;
        }

        const name = `post-${uuidv4()}`;
        const mimetype = event.target.files[i].type.split('/')[1];
        let myNewFile: any = new File([event.target.files[i]], `${name}.${mimetype}`, { type: event.target.files[i].type });

        var reader = new FileReader();
        reader.onload = (e: any) => {
          const newFile: PostMedia = {
            _id: `${name}`,
            typeFile: file.type.split('/'),
            url: e.target.result,
            type: 'ORIGINAL',
            cover: false,
            file: myNewFile
          };

          this.filesArray.update((prevFiles) => [...prevFiles, newFile]);

        };

        reader.readAsDataURL(event.target.files[i]);
        i++;
      }
    }
  }

  // delete file
  deleteImage(file: any) {
    this.filesArray.update((prevFiles) =>
      prevFiles.filter((item) => item._id !== file._id)
    );
    if (this.filesArray().length === 0) {
      //this.fileInput.nativeElement.value = '';
      this.myformMedia.patchValue({ fileImages: null });
    }
  }

  // subscription message
  subscriptionExpiredQuery(item: Message): boolean {

    if (item.typeView == 'FREE') {
      return false;
    } else {
      if (this.authService.user()!?._id !== item.Sender) {
        if (item.typeView == 'PAYMENT') {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }
  }

  onDelete(message: Message) {
    if (message && message._id) {
      this.messageService.removeMessages(message._id!);
      this.messageService.remove(message)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            if (res) {
            }
          },
          error: (err) => {
          },
          complete: () => {
          }
        });
    }

  }

  // send email
  async onSendEmail(data: any) {
    const { email } = data;

    if (this.isSenderEmail()) {
      return;
    }
    const res = await this.emailService.sendMail(email);

    if (res && res.status === "enqueued") {
      this.isSenderEmail.set(true);
    }
  }

  // created reply
  onReply(item: Message) {
    this.reply = item;
  }

  // writing
  onTextareaInput() {
    if (!this.authService.user()!) return;

    const sendData = {
      Chat: this.chatService.chat()!._id!,
      User: this.authService.user()!._id,
      isTyping: true
    };

    this.socketService.socket.emit('typing_status_send', sendData);

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    this.typingTimeout = setTimeout(() => {
      if (!this.authService.user()!) return;

      const sendData = {
        Chat: this.chatService.chat()!._id!,
        User: this.authService.user()!._id,
        isTyping: false
      };
      this.socketService.socket.emit('typing_status_send', sendData);
    }, 500); // Puedes ajustar el tiempo según tus necesidades
  }

  // is not writing
  onTextareaBlur() {

    if (!this.authService.user()!) return;

    this.isTyping.set(false);
    const sendData = {
      Chat: this.chatService.chat()!._id!,
      User: this.authService.user()!._id,
      isTyping: false
    };
    this.socketService.socket.emit('typing_status_send', sendData);
  }

  // copy link receiver
  copyText() {
    const textToCopy = `https://${environment.domain}` + this.messageService.userReceiver()!.username;
    navigator.clipboard.writeText(textToCopy).then(() => {
      this.toastService.start({ type: 'success', message: 'copied_link' });
    });
  }

  onUpgradeChat(payload: any) {
    const chat: Chat = this.chatService.chats().find(chat => chat!._id === payload._id)!;
    if (chat) {
      chat.LastMessage = payload.LastMessage;
      chat.lastMessageAt = payload.lastMessageAt;

      this.chatService.removeChats(chat._id!);
      const currentChats = this.chatService.chats();
      const updatedChats = [chat, ...currentChats];
      this.chatService.addChats(updatedChats);
    }
  }

  // modal
  async onDialogMedia() {

    const user = this.authService.user()!;
    if (user.status === 'SUSPENDED') {
      this.toastService.start({ type: 'error', message: 'accountSuspended' });
      return;
    }

    const userCredit = this.userCreditService.userCredit()?.current || 0;
    const gender = this.authService.user()?.gender || 'MAN';

    if (gender === 'MAN' && Number(userCredit) <= Number(0)) {
      this.onCreditPurchase();
      return;
    }

    this.filesArray.set([]);
    this.dialogService.toggleModal('mediaMessage');

  }

  onModalPost(message: Message) {

    const user = this.authService.user()!;
    if (user.status === 'SUSPENDED') {
      this.toastService.start({ type: 'error', message: 'accountSuspended' });
      return;
    }

    const post: Post = {
      slug: message._id,
      route: `chats/messages/${this.idChat}`,
      likes: 0,
      PostMedia: message.PostMedia,
      description: message.message
    };

    if (this.authService.user()! && this.authService.user()!._id !== message.Sender) {
      post.User = this.messageService.userReceiver()!
    } else {
      post.User = this.authService.user()!
    }
    this.postService.addPost(post);
    this.messageService.addMessage(message);

    this.router.navigate(['chats/messages', this.idChat, message._id]);
  }

  // tip
  onTip() {
    if (this.messageService.userReceiver()) {
      const dataTip: any = {
        type: 'TIP_CHAT',
        user: this.messageService.userReceiver()
      };
      this.tipService.addTip(dataTip);

      this.onTipModal();
    }
  }

  // video call
  async requestJoinCall() {

    if (!this.userService.hasEnoughCredits()) {
      this.onCreditPurchase();
      return;
    }

    this.spinnerService.start();
    const dataLive: any = {
      transmissionType: "VIDEOCALL",
      live: true,
      invitedUserIds: [this.messageService.userReceiver()!._id]
    }
    this.liveStreamService.handleLiveStreamStatus(dataLive)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (liveStream) => {
          if (liveStream) {
            this.onJoinCall();
          }
        },
        error: (err) => {
          this.spinnerService.close();
          this.toastService.start({ type: 'error', message: 'somethingWentWrong' });
        },
        complete: () => {
          this.spinnerService.close();
          this.toastService.start({ type: 'success', message: 'videoCallRequestSent' });
        }
      });

  }

  //modal external
  onCreditPurchase() {
    this.clearCreditPurchaseComponent();
    const componentRef = this.viewContainerRef.createComponent(CreditPurchaseComponent);
    this.creditPurchaseComponentRef = componentRef;
    componentRef.instance.closeModal.subscribe(() => {
      this.clearCreditPurchaseComponent(); // Destruye el componente hijo
      this.dialogService.closeModal(); // Cierra el modal visualmente
    });
    this.dialogService.toggleModal('creditPurchase');
  }

  private clearCreditPurchaseComponent() {
    if (this.creditPurchaseComponentRef) {
      this.creditPurchaseComponentRef.destroy();
      this.creditPurchaseComponentRef = null;
    }
  }

  onTipModal() {
    this.clearTipComponent();
    const componentRef = this.viewContainerRef.createComponent(TipComponent);
    this.tipComponentRef = componentRef;
    componentRef.instance.closeModal.subscribe(() => {
      this.clearTipComponent(); // Destruye el componente hijo
      this.dialogService.closeModal(); // Cierra el modal visualmente
    });
    this.dialogService.toggleModal('tipCredit');
  }

  private clearTipComponent() {
    if (this.tipComponentRef) {
      this.tipComponentRef.destroy();
      this.tipComponentRef = null;
    }
  }

  onJoinCall() {
    this.clearJoinCallComponent();
    const componentRef = this.viewContainerRef.createComponent(JoinCallComponent);
    this.joinCallComponentRef = componentRef;
    componentRef.instance.closeModal.subscribe(() => {
      this.clearJoinCallComponent();
      this.dialogService.closeModal();
    });
    this.dialogService.toggleModal('modalRequestJoinCall');
  }

  private clearJoinCallComponent() {
    if (this.joinCallComponentRef) {
      this.joinCallComponentRef.destroy();
      this.joinCallComponentRef = null;
    }
  }

  onCloseModal() {
    this.dialogService.closeModal();
  }

  //++++++DOCUMENT++++++
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.activeMenu() && !target.closest('.rounded-full') && !target.closest('.menu-container')) {
      this.activeMenu.set(null);
    }
  }

  // menu
  toggleMenuMessage(messageId: string) {
    this.activeMenu.update(current => current === messageId ? null : messageId);
  }

  get receiverMenuItems(): DropdownMenuItem[] {
    return [
      {
        label: 'reply',
        icon: 'reply-regular',
        action: (message: Message) => this.onReply(message),
        visible: true
      },
    ];
  }

  get senderMenuItems(): DropdownMenuItem[] {
    return [
      {
        label: 'delete',
        icon: 'delete-regular',
        action: (message: Message) => this.onDelete(message),
        visible: true
      },
      {
        label: 'reply',
        icon: 'reply-regular',
        action: (message: Message) => this.onReply(message),
        visible: true
      }
    ];
  }

  // return 
  onReturn(): void {
    this.router.navigate(['/chats']);
  }

  innerText(text: any) {
    return Tools.innerTextChat(text);
  }

  // input class
  selectClass(formGroup: FormGroup, controlName: string) {
    return Tools.inputClass(formGroup, controlName);
  }

  inputClass(formGroup: FormGroup, controlName: string) {
    return Tools.inputClass(formGroup, controlName);
  }

  textareaClass(formGroup: FormGroup, controlName: string, height: string) {
    return Tools.textareaClass(formGroup, controlName, height);
  }

  // scroll
  scrollToBottom() {
    if (this.messagesContainer && this.messagesContainer.nativeElement) {
      this.messagesContainer.nativeElement.scrollTo({
        top: 0, // 🔥 En column-reverse, el fondo es la posición 0
        behavior: 'smooth'
      });
      this.showScrollButton = false;
      this.isUserNearBottom = true;
    }
  }

  // Maneja el evento de scroll con lógica invertida
  onScroll() {
    const container = this.messagesContainer.nativeElement;

    // threshold: Margen en píxeles para detectar si el usuario se alejó del fondo
    const threshold = 80;

    // En column-reverse, si scrollTop es menor o igual al threshold, significa que estás abajo
    // Nota: Usamos Math.abs porque algunos navegadores manejan valores negativos al invertir el eje
    const currentScroll = Math.abs(container.scrollTop);

    this.isUserNearBottom = currentScroll <= threshold;

    // Mostramos el botón flotante SOLO si el usuario subió a revisar el historial (lejos de 0)
    this.showScrollButton = !this.isUserNearBottom;

    this.isUserScrolling = container.scrollTop < this.lastScrollTop;
    this.lastScrollTop = container.scrollTop;
  }

  // Detecta cuando el usuario deja de interactuar con el scroll
  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onScrollEnd() {
    setTimeout(() => {
      this.isUserScrolling = false; // Restablece el estado después de que el usuario termine de interactuar
    }, 100);
  }

  getFirstLetter(name: string): string {
    return this.toolsService.getFirstLetter(name);
  }

  // get media details
  getMediaDetails(item: any): PostMediaDetails | null {
    return this.postMediaService.getBackgroundImageUrl(item);
  }

  // input class
  cardModalClass() {
    return Tools.cardModalClass();
  }

  buttonClass() {
    return Tools.buttonClass();
  }

  buttonSecondaryClass() {
    return Tools.buttonSecondaryClass();
  }

  modalClass() {
    return Tools.modalClass();
  }
}
