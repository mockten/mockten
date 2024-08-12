package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"golang.org/x/crypto/bcrypt"

	_ "github.com/lib/pq"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

const (
	port = ":50051"
)

var (
	getCustomerAccountReqCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "getcustomeraccount_request",
		Help: "Total number of requests that have come to getmyaccount query",
	})

	getCustomerAccountResCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "getcustomeraccount_response",
		Help: "Total number of response that send from getmyaccount query",
	})
	editCustomerAccountReqCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "editcustomeraccount_request",
		Help: "Total number of requests that have come to editmyaccount query",
	})

	editCustomerAccountResCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "editcustomeraccount_response",
		Help: "Total number of response that send from editmyaccount query",
	})

	createCustomerAccountReqCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "createmyaccount_request",
		Help: "Total number of requests that have come to editmyaccount query",
	})

	createCustomerAccountResCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "createmyaccount_response",
		Help: "Total number of response that send from editmyaccount query",
	})

	deleteCustomerAccountReqCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "deletemyaccount_request",
		Help: "Total number of requests that have come to editmyaccount query",
	})

	deleteCustomerAccountResCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "deletemyaccount_response",
		Help: "Total number of response that send from editmyaccount query",
	})
	getSellerAccountReqCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "getselleraccount_request",
		Help: "Total number of requests that have come to getselleraccount query",
	})

	getSellerAccountResCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "getselleraccount_response",
		Help: "Total number of response that send from getmyaccount query",
	})
	editSellerAccountReqCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "editselleraccount_request",
		Help: "Total number of requests that have come to editselleraccount query",
	})

	editSellerAccountResCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "editselleraccount_response",
		Help: "Total number of response that send from editselleraccount query",
	})

	createSellerAccountReqCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "createselleraccount_request",
		Help: "Total number of requests that have come to editselleraccount query",
	})

	createSellerAccountResCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "createselleraccount_response",
		Help: "Total number of response that send from editselleraccount query",
	})

	deleteSellerAccountReqCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "deleteselleraccount_request",
		Help: "Total number of requests that have come to editselleraccount query",
	})

	deleteSellerAccountResCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "deleteselleraccount_response",
		Help: "Total number of response that send from editselleraccount query",
	})

	logger *zap.Logger
	db     *sql.DB
)

type User struct {
	UserID       string    `json:"user_id"`
	UserName     string    `json:"user_name"`
	MailAddress1 string    `json:"mail_address1"`
	MailAddress2 string    `json:"mail_address2"`
	PhoneNum     string    `json:"phone_num"`
	Address1     string    `json:"address1"`
	Address2     string    `json:"address2"`
	Address3     string    `json:"address3"`
	PostCode     int       `json:"post_code"`
	Premium      int       `json:"premium"`
	Sex          int       `json:"sex"`
	Birthday     time.Time `json:"birthday"`
	RegistDay    time.Time `json:"regist_day"`
	LastUpdate   time.Time `json:"last_update"`
}

type Seller struct {
	SellerID    string    `json:"seller_id"`
	UserID      string    `json:"user_id"`
	SellerName  string    `json:"seller_name"`
	MailAddress string    `json:"mail_address"`
	PhoneNum    string    `json:"phone_num"`
	Address1    string    `json:"address1"`
	Address2    string    `json:"address2"`
	Address3    string    `json:"address3"`
	PostCode    int       `json:"post_code"`
	Sex         int       `json:"sex"`
	Birthday    time.Time `json:"birthday"`
	RegistDay   time.Time `json:"regist_day"`
	LastUpdate  time.Time `json:"last_update"`
}

type UserPassword struct {
	UserID       string    `json:"user_id"`
	MailAddress1 string    `json:"mail_address1"`
	Password     string    `json:"password"`
	LastUpdate   time.Time `json:"last_update"`
}

type UserData struct {
	Users []User `json:"users"`
	Total int    `json:"total"`
}

/*
 * REST API
 */
func GetCustomerAccountByAdmin(c *gin.Context) {

	userID := c.Query("u")

	if userID == "" {
		logger.Error("User ID is missing when getting user data from SQL.")
		c.JSON(http.StatusNoContent, gin.H{"message": "hoge"})
		return
	}

	// logging request log
	logger.Debug("[getMyAccount] Request log", zap.String("user_id", userID))

	// increment counter
	getCustomerAccountReqCount.Inc()
	user, err := getUserDataBySQL(userID)
	if err != nil {

		c.JSON(http.StatusBadRequest, gin.H{
			"message": fmt.Errorf("no user found with user_id %s", userID),
		})
		return
	}
	// increment counter
	getCustomerAccountResCount.Inc()

	c.JSON(http.StatusOK, gin.H{
		"data": user,
	})
}

func EditCustomerAccountByAdmin(c *gin.Context) {
	userID := c.PostForm("user_id")
	userName := c.PostForm("user_name")         // string
	mailAddress1 := c.PostForm("mail_address1") // number
	mailAddress2 := c.PostForm("mail_address2") // number
	phoneNum := c.PostForm("phone_num")         // token
	address1 := c.PostForm("address1")          // token
	address2 := c.PostForm("address2")          // token
	address3 := c.PostForm("address3")          // token
	postCode := c.PostForm("post_code")         // token
	premium := c.PostForm("premium")            // token
	sex := c.PostForm("sex")                    // token
	birthday := c.PostForm("birthday")          // token

	logger.Debug("Request Edit Account data",
		zap.String("userID", userID),
		zap.String("userName", userName),
		zap.String("mailAddress1", mailAddress1),
		zap.String("mailAddress2", mailAddress2),
		zap.String("phoneNum", phoneNum),
		zap.String("address1", address1),
		zap.String("address2", address2),
		zap.String("address3", address3),
		zap.String("postCode", postCode),
		zap.String("payRank", premium),
		zap.String("sex", sex),
		zap.String("birthday", birthday))

	// increment counter
	editCustomerAccountReqCount.Inc()

	if userID == "" {
		logger.Error("userID parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}
	if userName == "" {
		logger.Error("userName parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}
	if mailAddress1 == "" {
		logger.Error("mailAddress1 parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}
	if premium == "" {
		logger.Error("premium parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}

	// check the data if it exist
	_, err := getUserDataBySQL(userID)
	if err != nil {

		c.JSON(http.StatusBadRequest, gin.H{
			"message": fmt.Errorf("no user found with user_id %s", userID),
		})
		return
	}

	query := `UPDATE user_info SET user_name = $1, mail_address1 = $2, mail_address2 = $3, phone_num = $4, address1 = $5, address2 = $6, address3 = $7, post_code = $8, premium = $9, sex = $10, birthday = $11, last_update = NOW() WHERE user_id = $12`
	result, err := db.Exec(query, userName, mailAddress1, mailAddress2, phoneNum, address1, address2, address3, postCode, premium, sex, birthday, userID)
	if err != nil {
		logger.Error("error insert data.")
		c.JSON(http.StatusForbidden, "NG")
		return
	}

	// check the number of affected rows. if it does not exist, return error.
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		logger.Error("Error when checking affected data.")
		c.JSON(http.StatusForbidden, "NG")
		return
	}

	if rowsAffected == 0 {
		logger.Error("No affected data when insert.")
		c.JSON(http.StatusForbidden, "NG")
		return
	}

	// increment counter
	editCustomerAccountResCount.Inc()
	c.JSON(http.StatusOK, "OK")
}

func EditSellerAccountByAdmin(c *gin.Context) {
	sellerID := c.PostForm("seller_id")
	userID := c.PostForm("user_id")           // string
	sellerName := c.PostForm("seller_name")   // number
	mailAddress := c.PostForm("mail_address") // number
	phoneNum := c.PostForm("phone_num")       // token
	address1 := c.PostForm("address1")        // token
	address2 := c.PostForm("address2")        // token
	address3 := c.PostForm("address3")        // token
	postCode := c.PostForm("post_code")       // token
	sex := c.PostForm("sex")                  // token
	birthday := c.PostForm("birthday")        // token

	logger.Debug("Request Edit Account data",
		zap.String("sellerID", sellerID),
		zap.String("userID", userID),
		zap.String("sellerName", sellerName),
		zap.String("mailAddress", mailAddress),
		zap.String("phoneNum", phoneNum),
		zap.String("address1", address1),
		zap.String("address2", address2),
		zap.String("address3", address3),
		zap.String("postCode", postCode),
		zap.String("sex", sex),
		zap.String("birthday", birthday))

	// increment counter
	editCustomerAccountReqCount.Inc()

	if userID == "" {
		logger.Error("userID parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}
	if sellerID == "" {
		logger.Error("sellerID parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}
	if sellerName == "" {
		logger.Error("sellerName parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}
	if mailAddress == "" {
		logger.Error("mailAddress1 parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}

	// check the data if it exist
	_, err := getUserDataBySQL(userID)
	if err != nil {

		c.JSON(http.StatusBadRequest, gin.H{
			"message": fmt.Errorf("no user found with user_id %s", userID),
		})
		return
	}

	query := `UPDATE seller_info SET user_id = $1, seller_name = $2, mail_address = $3, phone_num = $4, address1 = $5, address2 = $6, address3 = $7, post_code = $8, sex = $9, birthday = $10, last_update = NOW() WHERE seller_id = $11`
	result, err := db.Exec(query, userID, sellerName, mailAddress, phoneNum, address1, address2, address3, postCode, sex, birthday, sellerID)
	if err != nil {
		logger.Error("error insert data.")
		c.JSON(http.StatusForbidden, "NG")
		return
	}

	// check the number of affected rows. if it does not exist, return error.
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		logger.Error("Error when checking affected data.")
		c.JSON(http.StatusForbidden, "NG")
		return
	}

	if rowsAffected == 0 {
		logger.Error("No affected data when insert.")
		c.JSON(http.StatusForbidden, "NG")
		return
	}

	// increment counter
	editCustomerAccountResCount.Inc()
	c.JSON(http.StatusOK, "OK")
}

func CreateCustomerAccountByAdmin(c *gin.Context) {
	userName := c.PostForm("user_name")
	password := c.PostForm("password")
	confirmPassword := c.PostForm("confirm_password")
	mailAddress := c.PostForm("mail_address")
	subMailAddress := c.PostForm("sub_mail_address")
	phoneNum := c.PostForm("phone_num")
	address1 := c.PostForm("address1")
	address2 := c.PostForm("address2")
	address3 := c.PostForm("address3")
	postCode := c.PostForm("post_code")
	premium := c.PostForm("premium")
	sex := c.PostForm("sex")
	birthDay := c.PostForm("birth_day")

	logger.Debug("Request Edit Account data",
		zap.String("customerName", userName),
		zap.String("password", password),
		zap.String("confirmPassword", confirmPassword),
		zap.String("mailAddress", mailAddress),
		zap.String("subMailAddress", subMailAddress),
		zap.String("phoneNum", phoneNum),
		zap.String("address1", address1),
		zap.String("address2", address2),
		zap.String("address3", address3),
		zap.String("postCode", postCode))
	// increment counter
	createCustomerAccountReqCount.Inc()

	if userName == "" {
		logger.Error("customerName parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}
	if password == "" {
		logger.Error("password parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}
	if confirmPassword == "" {
		logger.Error("confirmPassword parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}
	if mailAddress == "" {
		logger.Error("mailAddress parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}
	if mailAddress == "" {
		logger.Error("mailAddress parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}

	newUUID := uuid.New()

	query := `INSERT INTO user_info (user_id, user_name, mail_address1, mail_address2, phone_num, address1, address2, address3, post_code, premium, sex, birth_day, regist_day, last_update) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`

	_, err := db.Exec(query, newUUID, userName, mailAddress, subMailAddress, phoneNum, address1, address2, address3, postCode, premium, sex, birthDay)
	if err != nil {
		logger.Error("error insert data to customer table.")
		c.JSON(http.StatusForbidden, "NG")
		return
	}

	passwordQuery := `INSERT INTO user_password (user_id, mail_address, password, last_update) VALUES ($1, $2, $3, NOW())`
	hashPassword, err := hashPassword(password)
	if err != nil {
		logger.Error("error occurd when hash password")
		c.JSON(http.StatusForbidden, "NG")
		return
	}
	_, err = db.Exec(passwordQuery, newUUID, mailAddress, hashPassword)
	if err != nil {
		logger.Error("error insert data to customer password table.")
		c.JSON(http.StatusForbidden, "NG")
		return
	}

	// increment counter
	createCustomerAccountResCount.Inc()
	c.JSON(http.StatusOK, "OK")
}

func CreateSellerAccountByAdmin(c *gin.Context) {

	sellerName := c.PostForm("seller_name") // string
	password := c.PostForm("password")      // string
	confirmPassword := c.PostForm("confirm_password")
	mailAddress := c.PostForm("mail_address") // string
	phoneNum := c.PostForm("phone_num")       // token
	address1 := c.PostForm("address1")        // token
	address2 := c.PostForm("address2")        // token
	address3 := c.PostForm("address3")        // token
	postCode := c.PostForm("post_code")       // token
	sex := c.PostForm("sex")                  // token
	birthday := c.PostForm("birthday")        // token

	logger.Debug("Request Edit Account data",
		zap.String("sellerName", sellerName),
		zap.String("mailAddress", mailAddress),
		zap.String("phoneNum", phoneNum),
		zap.String("address1", address1),
		zap.String("address2", address2),
		zap.String("address3", address3),
		zap.String("postCode", postCode),
		zap.String("sex", sex),
		zap.String("birthday", birthday))

	// increment counter
	createSellerAccountReqCount.Inc()

	if sellerName == "" {
		logger.Error("sellerName parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}
	if mailAddress == "" {
		logger.Error("mailAddress parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}
	if password == "" {
		logger.Error("password parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}
	if confirmPassword == "" {
		logger.Error("confirmPassword parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}

	newUUID := uuid.New()

	query := `INSERT INTO seller_info (seller_id, seller_name, mail_address, phone_num, address1, address2, address3, post_code, sex, birthday, regist_day, last_update ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`

	_, err := db.Exec(query, newUUID, sellerName, mailAddress, phoneNum, address1, address2, address3, postCode, sex, birthday)
	if err != nil {
		logger.Error("error insert data.")
		c.JSON(http.StatusForbidden, "NG")
		return
	}

	hashPassword, err := hashPassword(password)
	if err != nil {
		logger.Error("error occurd when hash password")
		c.JSON(http.StatusForbidden, "NG")
		return
	}

	passwordQuery := `INSERT INTO seller_password (seller_id, mail_address, password, last_update) VALUES ($1, $2, $3, NOW())`

	_, err = db.Exec(passwordQuery, newUUID, mailAddress, hashPassword)
	if err != nil {
		logger.Error("error insert data.")
		c.JSON(http.StatusForbidden, "NG")
		return
	}

	// increment counter
	createSellerAccountResCount.Inc()
	c.JSON(http.StatusOK, "OK")
}

func DeleteCustomerAccountByAdmin(c *gin.Context) {

	userID := c.PostForm("userID")             // string
	mailaddress := c.PostForm("mail_address1") // number
	password := c.PostForm("password")         // number

	if userID == "" || mailaddress == "" || password == "" {
		logger.Error("Delete account parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Some mandatory parameter are missing."})
		return
	}
	// logging request log
	logger.Debug("Request log", zap.String("userID", userID), zap.String("mailaddress", mailaddress), zap.String("password", password))

	user, err := getUserDataBySQL(userID)
	if err != nil {
		logger.Error("error on getting data from SQL")
		return
	}

	if user.MailAddress1 != mailaddress {
		logger.Error("different mailaddress")
		return
	}

	if password != "password" {
		logger.Error("different password")
		return
	}

	query := `DELETE FROM user_info WHERE user_id = $1`
	result, err := db.Exec(query, userID)
	if err != nil {
		logger.Error("No user data in MongoDB.")
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		logger.Error("No user data in MongoDB.")
		return
	}

	if rowsAffected == 0 {
		logger.Error("No user data in MongoDB.")
		return
	}

	c.JSON(http.StatusOK, "OK")
}

func DeleteSellerAccountByAdmin(c *gin.Context) {

	sellerID := c.PostForm("sellerID")        // string
	mailaddress := c.PostForm("mail_address") // number
	password := c.PostForm("password")        // number

	if sellerID == "" || mailaddress == "" || password == "" {
		logger.Error("Delete account parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Some mandatory parameter are missing."})
		return
	}
	// logging request log
	logger.Debug("Request log", zap.String("sellerID", sellerID), zap.String("mailaddress", mailaddress), zap.String("password", password))

	seller, err := getSellerDataBySQL(sellerID)
	if err != nil {
		logger.Error("error on getting data from SQL")
		return
	}

	if seller.MailAddress != mailaddress {
		logger.Error("different mailaddress")
		return
	}

	if password != "password" {
		logger.Error("different password")
		return
	}

	query := `DELETE FROM seller_info WHERE seller_id = $1`
	result, err := db.Exec(query, sellerID)
	if err != nil {
		logger.Error("No user data in MongoDB.")
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		logger.Error("No user data in MongoDB.")
		return
	}

	if rowsAffected == 0 {
		logger.Error("No user data in MongoDB.")
		return
	}

	c.JSON(http.StatusOK, "OK")
}

func getUserDataBySQL(userID string) (*User, error) {
	query := `SELECT * FROM user_info WHERE user_id = $1`
	row := db.QueryRow(query, userID)

	var user User
	err := row.Scan(&user.UserID, &user.UserName, &user.MailAddress1, &user.MailAddress2, &user.PhoneNum, &user.Address1, &user.Address2, &user.Address3, &user.PostCode, &user.Premium, &user.Sex, &user.RegistDay, &user.Birthday, &user.LastUpdate)
	if err != nil {
		if err == sql.ErrNoRows {
			logger.Error("No user data in MongoDB.")
			return nil, err
		}
		logger.Error("SQL error when user get account data.")
		return nil, err
	}
	return &user, nil
}

func getSellerDataBySQL(sellerID string) (*Seller, error) {
	query := `SELECT * FROM seller_info WHERE seller_id = $1`
	row := db.QueryRow(query, sellerID)

	var seller Seller
	err := row.Scan(&seller.SellerID, &seller.UserID, &seller.SellerName, &seller.MailAddress, &seller.PhoneNum, &seller.Address1, &seller.Address2, &seller.Address3, &seller.PostCode, &seller.Sex, &seller.Birthday, &seller.RegistDay, &seller.LastUpdate)
	if err != nil {
		if err == sql.ErrNoRows {
			logger.Error("No user data in MongoDB.")
			return nil, err
		}
		logger.Error("SQL error when user get account data.")
		return nil, err
	}
	return &seller, nil
}

func verifyPassword(pass string, cpass string) bool {
	if pass != cpass {
		return false
	}
	// if passowrd doesnot contain special charactor, return false
	return true
}

func hashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedPassword), nil
}

func main() {
	// set-up logging environment using zap
	var err error

	environment := os.Getenv("CAOLILA_ENV")

	if environment == "development" || environment == "" {
		config := zap.NewDevelopmentConfig()
		config.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
		logger, err = config.Build()
	} else {
		config := zap.NewProductionConfig()
		config.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
		logger, err = config.Build()
	}

	if err != nil {
		log.Println("failed to set-up zap log in search component. \n")
		panic(err)
	}

	logger.Debug("this is development environment.")
	logger.Info("success set-up logging function.")

	defer logger.Sync()

	// set up PostgreSQL
	pgHost := os.Getenv("PG_HOST")
	pgPort := os.Getenv("PG_PORT")
	pgInitUser := os.Getenv("PG_INIT_USER")
	pgInitPass := os.Getenv("PG_INIT_PASS")
	pgCaolilaDB := os.Getenv("PG_CAOLILA_DB")
	pgSsl := os.Getenv("PG_SSL")

	if pgHost == "" {
		logger.Error("does not exist PG_HOST.")
		pgHost = "localhost"
	}
	if pgPort == "" {
		logger.Error("does not exist PG_PORT.")
		pgPort = "5432"
	}
	if pgInitUser == "" {
		logger.Error("does not exist PG_INIT_USER.")
		pgInitUser = "power"
	}
	if pgInitPass == "" {
		logger.Error("does not exist PG_INIT_PASS.")
		pgInitPass = "bar"
	}
	if pgCaolilaDB == "" {
		logger.Error("does not exist PG_CAOLILA_DB.")
		pgCaolilaDB = "caolila"
	}
	if pgSsl == "" {
		logger.Error("does not exist PG_SSL.")
		pgSsl = "disable"
	}
	connStr := "host=" + pgHost + " port=" + pgPort + " user=" + pgInitUser + " password=" + pgInitPass + " dbname=" + pgCaolilaDB + " sslmode=" + pgSsl
	logger.Debug(connStr)

	// データベースへの接続を開く
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	err = db.Ping()
	if err != nil {
		log.Fatal(err)
	}
	// expose /metrics endpoint for observer(by default Prometheus).
	go exportMetrics()

	// start application
	router := gin.Default()
	router.POST("v1/admin/customer/create", CreateCustomerAccountByAdmin)
	router.POST("v1/admin/seller/create", CreateSellerAccountByAdmin)
	router.POST("v1/admin/customer/edit", EditCustomerAccountByAdmin)
	router.POST("v1/admin/seller/edit", EditSellerAccountByAdmin)
	router.DELETE("v1/admin/customer/delete", DeleteCustomerAccountByAdmin)
	router.DELETE("v1/admin/seller/delete", DeleteSellerAccountByAdmin)
	router.Run(port)

}

// for goroutin
func exportMetrics() {
	http.Handle("/metrics", promhttp.Handler())
	http.ListenAndServe(":9100", nil)
}
